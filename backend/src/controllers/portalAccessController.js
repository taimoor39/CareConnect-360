import crypto from 'node:crypto';
import mongoose from 'mongoose';

import Patient from '../models/Patient.js';
import PortalAccessRequest from '../models/PortalAccessRequest.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import auditLogger from '../utils/auditLogger.js';
import { sendPortalWelcomeEmail } from '../utils/emailService.js';
import { paginationMeta, parsePagination } from '../utils/query.js';

const ensureObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw AppError.badRequest(`Invalid ${fieldName}`);
  }
};

const sanitizeEmail = (value) => String(value || '').trim().toLowerCase();

export const listPortalAccessRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const statusInput = String(req.query.status || '').trim().toLowerCase();
  const status = ['pending', 'approved', 'rejected', 'all'].includes(statusInput)
    ? statusInput
    : 'pending';

  const query = status === 'all' ? {} : { status };
  const [requests, total, pending, approved, rejected] = await Promise.all([
    PortalAccessRequest.find(query)
      .populate('patientId', 'name patientId phone email')
      .populate('requestedBy', 'name role')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PortalAccessRequest.countDocuments(query),
    PortalAccessRequest.countDocuments({ status: 'pending' }),
    PortalAccessRequest.countDocuments({ status: 'approved' }),
    PortalAccessRequest.countDocuments({ status: 'rejected' }),
  ]);

  res.json({
    success: true,
    data: {
      requests,
      pagination: paginationMeta(total, page, limit),
      counts: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
      },
    },
  });
});

export const getPortalAccessStats = asyncHandler(async (_req, res) => {
  const pending = await PortalAccessRequest.countDocuments({ status: 'pending' });
  res.json({ success: true, data: { pending } });
});

export const createPortalAccessRequest = asyncHandler(async (req, res) => {
  const { patientId, requestedEmail } = req.body;
  ensureObjectId(patientId, 'patientId');

  const normalizedEmail = sanitizeEmail(requestedEmail);
  if (!normalizedEmail) {
    throw AppError.badRequest('requestedEmail is required');
  }

  const patient = await Patient.findById(patientId);
  if (!patient) throw AppError.notFound('Patient not found');
  if (patient.userId) throw AppError.badRequest('Patient already has a portal account');

  const existing = await PortalAccessRequest.findOne({ patientId, status: 'pending' });
  if (existing) throw AppError.badRequest('A portal access request is already pending');

  const emailTaken = await User.findOne({ email: normalizedEmail }).lean();
  if (emailTaken) {
    throw AppError.conflict('This email is already registered in the system');
  }

  const request = await PortalAccessRequest.create({
    patientId,
    requestedEmail: normalizedEmail,
    requestedBy: req.user._id,
    status: 'pending',
  });

  await Patient.findByIdAndUpdate(patientId, {
    portalAccessRequested: true,
    portalAccessEmail: normalizedEmail,
    portalAccessRequestedAt: new Date(),
    portalAccessRequestedBy: req.user._id,
    portalAccessStatus: 'pending',
    portalAccessRejectionReason: null,
  });

  await auditLogger({
    userId: req.user._id,
    action: 'PORTAL_ACCESS_REQUESTED',
    target: `Patient:${patientId}`,
    targetCollection: 'patients',
    details: {
      requestedEmail: normalizedEmail,
      patientName: patient.name,
      patientCode: patient.patientId,
    },
    req,
  });

  res.status(201).json({
    success: true,
    data: request,
    message: 'Portal access request submitted. Admin will review and approve.',
  });
});

export const approvePortalAccessRequest = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id, 'request id');
  const request = await PortalAccessRequest.findById(req.params.id).populate('patientId');

  if (!request) throw AppError.notFound('Portal access request not found');
  if (request.status !== 'pending') throw AppError.badRequest('Request is no longer pending');

  const patient = request.patientId;
  if (!patient) throw AppError.notFound('Patient not found for this request');
  if (patient.userId) throw AppError.badRequest('Patient already has a portal account');

  const emailTaken = await User.findOne({ email: request.requestedEmail }).lean();
  if (emailTaken) {
    throw AppError.conflict('Email is now taken by another user. Ask receptionist to update the email.');
  }

  const tempPassword = `${crypto.randomBytes(4).toString('hex').toUpperCase()}!9`;
  const newUser = await User.create({
    name: patient.name,
    email: request.requestedEmail,
    password: tempPassword,
    phone: patient.phone || 'N/A',
    role: 'patient',
    isActive: true,
    requirePasswordChange: true,
  });

  await Promise.all([
    Patient.findByIdAndUpdate(patient._id, {
      userId: newUser._id,
      portalAccessStatus: 'approved',
      portalAccessRequested: true,
      portalAccessEmail: request.requestedEmail,
      portalAccessRejectionReason: null,
    }),
    PortalAccessRequest.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      createdUserId: newUser._id,
      rejectionReason: null,
      rejectedBy: null,
      rejectedAt: null,
    }),
  ]);

  sendPortalWelcomeEmail({
    patient,
    email: request.requestedEmail,
    tempPassword,
    approvedByName: req.user.name,
  }).catch((err) => {
    console.error('[EMAIL] Welcome email failed:', err);
  });

  await auditLogger({
    userId: req.user._id,
    action: 'PORTAL_ACCESS_APPROVED',
    target: `Patient:${patient._id}`,
    targetCollection: 'patients',
    details: {
      patientName: patient.name,
      patientCode: patient.patientId,
      createdUserId: newUser._id,
      email: request.requestedEmail,
    },
    req,
  });

  res.json({
    success: true,
    message: `Portal account created for ${patient.name}. A welcome email with login instructions has been sent to ${request.requestedEmail}`,
    data: {
      userId: newUser._id,
      email: request.requestedEmail,
      patientId: patient._id,
    },
  });
});

export const rejectPortalAccessRequest = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id, 'request id');
  const request = await PortalAccessRequest.findById(req.params.id).populate('patientId', 'name patientId');
  if (!request) throw AppError.notFound('Portal access request not found');
  if (request.status !== 'pending') throw AppError.badRequest('Request is no longer pending');

  const reason = String(req.body.reason || '').trim() || null;

  await Promise.all([
    PortalAccessRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      rejectedBy: req.user._id,
      rejectedAt: new Date(),
      rejectionReason: reason,
    }),
    Patient.findByIdAndUpdate(request.patientId?._id, {
      portalAccessStatus: 'rejected',
      portalAccessRejectionReason: reason,
      portalAccessRequested: true,
      portalAccessEmail: request.requestedEmail,
    }),
  ]);

  await auditLogger({
    userId: req.user._id,
    action: 'PORTAL_ACCESS_REJECTED',
    target: `Patient:${request.patientId?._id || request.patientId}`,
    targetCollection: 'patients',
    details: {
      reason,
      email: request.requestedEmail,
    },
    req,
  });

  res.json({
    success: true,
    message: 'Portal access request rejected',
  });
});

export const updatePortalAccessRequestedEmail = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id, 'request id');
  const newEmail = sanitizeEmail(req.body.newEmail);
  if (!newEmail) throw AppError.badRequest('newEmail is required');

  const request = await PortalAccessRequest.findById(req.params.id);
  if (!request) throw AppError.notFound('Portal access request not found');
  if (request.status !== 'pending') throw AppError.badRequest('Only pending requests can be updated');

  const emailTaken = await User.findOne({ email: newEmail }).lean();
  if (emailTaken) throw AppError.conflict('This email is already registered in the system');

  request.requestedEmail = newEmail;
  await request.save();

  await Patient.findByIdAndUpdate(request.patientId, {
    portalAccessEmail: newEmail,
  });

  await auditLogger({
    userId: req.user._id,
    action: 'PORTAL_ACCESS_EMAIL_UPDATED',
    target: `Patient:${request.patientId}`,
    targetCollection: 'patients',
    details: {
      requestId: request._id,
      newEmail,
    },
    req,
  });

  res.json({
    success: true,
    message: 'Requested email updated successfully',
    data: request,
  });
});

export const getPortalAccessForPatient = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.patientId, 'patientId');

  const patient = await Patient.findById(req.params.patientId).select('userId portalAccessStatus');
  if (!patient) throw AppError.notFound('Patient not found');

  const request = await PortalAccessRequest.findOne({ patientId: req.params.patientId }).sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    data: {
      hasPortalAccess: Boolean(patient.userId),
      request: request || null,
      userId: patient.userId || null,
    },
  });
});

export const reopenPortalAccessRequest = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id, 'request id');
  const request = await PortalAccessRequest.findById(req.params.id);
  if (!request) throw AppError.notFound('Portal access request not found');
  if (request.status !== 'rejected') {
    throw AppError.badRequest('Only rejected requests can be re-opened');
  }

  const emailTaken = await User.findOne({ email: request.requestedEmail }).lean();
  if (emailTaken) throw AppError.conflict('This email is already registered in the system');

  request.status = 'pending';
  request.rejectionReason = null;
  request.rejectedBy = null;
  request.rejectedAt = null;
  await request.save();

  await Patient.findByIdAndUpdate(request.patientId, {
    portalAccessStatus: 'pending',
    portalAccessRejectionReason: null,
    portalAccessRequested: true,
    portalAccessEmail: request.requestedEmail,
  });

  await auditLogger({
    userId: req.user._id,
    action: 'PORTAL_ACCESS_REOPENED',
    target: `Patient:${request.patientId}`,
    targetCollection: 'patients',
    details: {
      requestId: request._id,
      email: request.requestedEmail,
    },
    req,
  });

  res.json({
    success: true,
    message: 'Portal access request moved back to pending',
  });
});

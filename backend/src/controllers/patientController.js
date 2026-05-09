import mongoose from 'mongoose';

import Patient from '../models/Patient.js';
import PortalAccessRequest from '../models/PortalAccessRequest.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';

// ─── Normalizers ──────────────────────────────────────────────────────────

const GENDER_MAP = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Other', Male: 'Male', Female: 'Female', Other: 'Other' };
const STATUS_MAP = { active: 'Active', inactive: 'Inactive', discharged: 'Discharged', Active: 'Active', Inactive: 'Inactive', Discharged: 'Discharged' };

const normalizeGender = (v) => GENDER_MAP[v] || 'Other';
const normalizeStatus = (v) => STATUS_MAP[v] || 'Active';

const listFromInput = (value) => {
  if (Array.isArray(value)) return value.map((i) => String(i).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((i) => i.trim()).filter(Boolean);
  return [];
};

// ─── Payload builders ─────────────────────────────────────────────────────

const buildPayload = (body, userId) => ({
  firstName: String(body.firstName || '').trim(),
  lastName: String(body.lastName || '').trim(),
  middleName: String(body.middleName || '').trim(),
  name: String(body.name || `${body.firstName || ''} ${body.lastName || ''}`).trim(),
  dateOfBirth: body.dateOfBirth,
  gender: normalizeGender(body.gender),
  bloodGroup: body.bloodGroup || '',
  phone: String(body.phone || '').trim(),
  email: String(body.email || '').trim().toLowerCase(),
  contact: {
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
  },
  address: {
    street: String(body.addressStreet || body.addressLine1 || '').trim(),
    line1: String(body.addressLine1 || body.addressStreet || '').trim(),
    line2: String(body.addressLine2 || '').trim(),
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    postalCode: String(body.postalCode || '').trim(),
    country: String(body.country || '').trim(),
  },
  emergencyContact: {
    name: String(body.emergencyName || '').trim(),
    relation: String(body.emergencyRelation || '').trim(),
    phone: String(body.emergencyPhone || '').trim(),
  },
  insurance: {
    provider: String(body.insuranceProvider || '').trim(),
    policyNumber: String(body.insurancePolicyNumber || '').trim(),
    groupNumber: String(body.insuranceGroupNumber || '').trim(),
    validTill: body.insuranceValidTill || null,
  },
  medical: {
    allergies: listFromInput(body.allergies),
    conditions: listFromInput(body.conditions),
    medications: listFromInput(body.medications),
    surgeries: listFromInput(body.surgeries),
    familyHistory: listFromInput(body.familyHistory),
    notes: String(body.medicalNotes || '').trim(),
  },
  medicalNotes: String(body.medicalNotes || '').trim(),
  status: normalizeStatus(body.status),
  isArchived: Boolean(body.isArchived),
  updatedBy: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
  registeredBy: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
});

// ─── Linked-user management ──────────────────────────────────────────────

const ensureLinkedUser = async ({ patient, reqBody, shouldCreate }) => {
  const email = String(reqBody.email || '').trim().toLowerCase();
  const password = String(reqBody.password || '').trim();
  const hasCredentials = email && password;

  if (!hasCredentials && !patient?.user && !shouldCreate) return null;

  // Creating a brand-new linked user account
  if (hasCredentials && !patient?.user && shouldCreate) {
    const existing = await User.findOne({ email }).lean();
    if (existing) throw AppError.conflict('A user already exists with this email');

    const user = await User.create({
      name: `${String(reqBody.firstName || '').trim()} ${String(reqBody.lastName || '').trim()}`.trim(),
      email,
      phone: String(reqBody.phone || '').trim(),
      password,
      role: 'patient',
    });
    return user._id;
  }

  // Updating an existing linked user account
  if (patient?.user && hasCredentials) {
    const dup = await User.findOne({ email, _id: { $ne: patient.user } }).lean();
    if (dup) throw AppError.conflict('A user already exists with this email');

    const linked = await User.findById(patient.user).select('+password');
    if (linked) {
      linked.name = `${String(reqBody.firstName || patient.firstName || '').trim()} ${String(reqBody.lastName || patient.lastName || '').trim()}`.trim();
      linked.email = email;
      linked.phone = String(reqBody.phone || '').trim();
      if (password) linked.password = password;
      await linked.save();
    }
  }

  return patient?.user || null;
};

// ─── Public view ──────────────────────────────────────────────────────────

const toPublicPatient = (doc) => {
  const patient = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  return {
    ...patient,
    patientId: patient.patientId || patient.patientCode,
    status: normalizeStatus(patient.status),
    gender: normalizeGender(patient.gender),
    name: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
    age,
  };
};

// ─── Route handlers ───────────────────────────────────────────────────────

export const listPatients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sortBy = String(req.query.sortBy || 'createdAt').trim();
  const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const status = String(req.query.status || '').trim();

  const query = { isArchived: false };
  const regex = searchRegex(req.query.search);
  if (regex) {
    query.$or = [
      { name: regex }, { firstName: regex }, { lastName: regex },
      { email: regex }, { 'contact.email': regex },
      { phone: regex }, { 'contact.phone': regex },
      { patientId: regex }, { patientCode: regex },
    ];
  }
  if (status && status !== 'All Status') query.status = normalizeStatus(status);

  const [patients, total] = await Promise.all([
    Patient.find(query).select('-__v').sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      patients: patients.map(toPublicPatient),
      pagination: paginationMeta(total, page, limit),
    },
  });
});

export const searchPatients = asyncHandler(async (req, res) => {
  req.query.search = String(req.query.q || '').trim();
  return listPatients(req, res);
});

export const getPatientStats = asyncHandler(async (_req, res) => {
  const [totalPatients, activePatients, inactivePatients] = await Promise.all([
    Patient.countDocuments({ isArchived: false }),
    Patient.countDocuments({ isArchived: false, status: 'Active' }),
    Patient.countDocuments({ isArchived: false, status: 'Inactive' }),
  ]);

  res.json({ success: true, data: { totalPatients, activePatients, inactivePatients } });
});

export const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, isArchived: false }).select('-__v').lean();
  if (!patient) throw AppError.notFound('Patient not found');

  res.json({ success: true, data: { patient: toPublicPatient(patient) } });
});

export const createPatient = asyncHandler(async (req, res) => {
  if (req.body.email) {
    const dup = await User.findOne({ email: String(req.body.email).toLowerCase().trim() }).lean();
    if (dup) throw AppError.conflict('A user already exists with this email');
  }
  const wantsPortalAccess = Boolean(req.body.portalAccessRequested);
  const portalAccessEmail = String(req.body.portalAccessEmail || '').trim().toLowerCase();
  if (wantsPortalAccess && !portalAccessEmail) {
    throw AppError.badRequest('portalAccessEmail is required when portalAccessRequested is true');
  }
  if (portalAccessEmail) {
    const portalEmailTaken = await User.findOne({ email: portalAccessEmail }).lean();
    if (portalEmailTaken) throw AppError.conflict('Portal access email is already registered in the system');
  }

  const linkedUserId = await ensureLinkedUser({
    patient: null,
    reqBody: req.body,
    shouldCreate: true,
  });

  const count = await Patient.countDocuments();
  const year = new Date().getFullYear();
  const patientId = `PAT-${year}-${String(count + 1).padStart(4, '0')}`;

  const payload = buildPayload(req.body, req.user._id);
  const createData = { ...payload, patientId, patientCode: patientId };
  if (linkedUserId) createData.user = linkedUserId;
  if (wantsPortalAccess && !linkedUserId) {
    createData.portalAccessRequested = true;
    createData.portalAccessEmail = portalAccessEmail;
    createData.portalAccessRequestedAt = new Date();
    createData.portalAccessRequestedBy = req.user._id;
    createData.portalAccessStatus = 'pending';
  }

  const patient = await Patient.create(createData);

  if (wantsPortalAccess && !linkedUserId) {
    await PortalAccessRequest.create({
      patientId: patient._id,
      requestedEmail: portalAccessEmail,
      requestedBy: req.user._id,
      status: 'pending',
    });
  }

  await auditFromReq(req, 'PATIENT_CREATED', `Patient:${patient._id}`, {
    patientId: patient.patientId,
    linkedUserId: linkedUserId || null,
    portalAccessRequested: wantsPortalAccess && !linkedUserId,
  });

  notifyAdmins({
    scopes: wantsPortalAccess && !linkedUserId ? ['dashboard', 'portalBadge'] : ['dashboard'],
    reason: 'patient_created',
  });

  res.status(201).json({ success: true, data: { patient: toPublicPatient(patient) } });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, isArchived: false });
  if (!patient) throw AppError.notFound('Patient not found');

  await ensureLinkedUser({ patient, reqBody: req.body, shouldCreate: false });

  const payload = buildPayload(req.body, req.user._id);
  const updated = await Patient.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).select('-__v');

  await auditFromReq(req, 'PATIENT_UPDATED', `Patient:${updated._id}`, {
    status: updated.status,
    email: updated.email,
    phone: updated.phone,
  });

  res.json({ success: true, data: { patient: toPublicPatient(updated) } });
});

export const archivePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, isArchived: false });
  if (!patient) throw AppError.notFound('Patient not found');

  patient.isArchived = true;
  patient.status = 'Inactive';
  await patient.save();

  await auditFromReq(req, 'PATIENT_ARCHIVED', `Patient:${patient._id}`, {
    patientId: patient.patientId || patient.patientCode || null,
  });

  notifyAdmins({ scopes: ['dashboard'], reason: 'patient_archived' });

  res.json({ success: true, message: 'Patient archived successfully' });
});

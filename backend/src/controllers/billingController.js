import Appointment from '../models/Appointment.js';
import Invoice from '../models/Invoice.js';
import Patient from '../models/Patient.js';
import generateInvoicePDF from '../utils/generateInvoicePDF.js';

import { notifyAdmins } from '../realtime/adminRealtime.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { dayBoundsInPakistan } from '../utils/dateTime.js';
import { resolvePatientForPortalUser } from '../utils/patientLink.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';
import {
  assertPatientOwnsInvoice,
  attachSpecialization,
  buildAmounts,
  enrichedInvoice,
  findInvoiceOrFail,
  populateInvoice,
  resolveRefId,
} from '../services/billingService.js';

// ─── Route handlers ───────────────────────────────────────────────────────

export const listInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sortBy = String(req.query.sortBy || 'createdAt');
  const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const status = String(req.query.status || '').trim();

  const query = {};
  if (status && status !== 'All Status') query.paymentStatus = status;

  if (req.user.role === 'patient') {
    const patient = await resolvePatientForPortalUser(req.user, '_id');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }
    query.patientId = patient._id;
  } else if (req.query.patientId) {
    query.patientId = req.query.patientId;
  }

  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) query.createdAt.$gte = dayBoundsInPakistan(req.query.from)?.start;
    if (req.query.to) {
      query.createdAt.$lte = dayBoundsInPakistan(req.query.to)?.end;
    }
  }

  const regex = searchRegex(req.query.search);
  if (regex && req.user.role !== 'patient') {
    const patients = await Patient.find({ $or: [{ name: regex }, { patientId: regex }, { patientCode: regex }] }).select('_id').lean();
    query.$or = [{ invoiceNumber: regex }, { patientId: { $in: patients.map((p) => p._id) } }];
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name')
      .populate('generatedBy', 'name')
      .populate('appointmentId', 'date timeSlot')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(query),
  ]);

  const data = await attachSpecialization(invoices);
  res.json({ success: true, data: { invoices: data, pagination: paginationMeta(total, page, limit) } });
});

export const getBillingStats = asyncHandler(async (_req, res) => {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [totalInvoices, revenueAgg, pendingAgg, monthAgg] = await Promise.all([
    Invoice.countDocuments(),
    Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    Invoice.aggregate([
      { $match: { paymentStatus: { $in: ['Unpaid', 'Partial'] } } },
      { $group: { _id: null, pending: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
    ]),
    Invoice.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);

  res.json({
    success: true,
    data: {
      totalInvoices,
      totalRevenue: revenueAgg[0]?.total || 0,
      pendingAmount: pendingAgg[0]?.pending || 0,
      thisMonthTotal: monthAgg[0]?.total || 0,
    },
  });
});

export const getRevenueSummary = asyncHandler(async (_req, res) => {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const monthlyRevenue = await Promise.all(
    months.map(async ({ year, month }) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const [agg] = await Invoice.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } },
      ]);
      return { month: start.toLocaleString('default', { month: 'short' }), year, total: agg?.total || 0, paid: agg?.paid || 0 };
    }),
  );

  const methodBreakdown = await Invoice.aggregate([
    { $match: { paymentMethod: { $ne: null } } },
    { $group: { _id: '$paymentMethod', total: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
  ]);

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const topPatients = await Invoice.aggregate([
    { $match: { createdAt: { $gte: startOfMonth } } },
    { $group: { _id: '$patientId', total: { $sum: '$totalAmount' } } },
    { $sort: { total: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'patients', localField: '_id', foreignField: '_id', as: 'patient' } },
    { $unwind: '$patient' },
  ]);

  res.json({ success: true, data: { monthlyRevenue, methodBreakdown, topPatients } });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await populateInvoice(req.params.id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  await assertPatientOwnsInvoice(req, invoice);
  const [row] = await attachSpecialization(invoice);
  res.json({ success: true, data: row });
});

export const getInvoiceByAppointment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ appointmentId: req.params.appointmentId }).lean();
  res.json({ success: true, data: invoice || null });
});

export const getCompletedAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { status: 'Completed' };

  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = dayBoundsInPakistan(req.query.from)?.start;
    if (req.query.to) {
      query.date.$lte = dayBoundsInPakistan(req.query.to)?.end;
    }
  }

  const invoiced = await Invoice.distinct('appointmentId');
  query._id = { $nin: invoiced };

  const regex = searchRegex(req.query.search);
  if (regex) {
    const patients = await Patient.find({ $or: [{ name: regex }, { patientId: regex }, { patientCode: regex }] }).select('_id').lean();
    query.patientId = { $in: patients.map((p) => p._id) };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  res.json({ success: true, data: { appointments, pagination: paginationMeta(total, page, limit) } });
});

export const createInvoice = asyncHandler(async (req, res) => {
  const { appointmentId, paymentStatus, paymentMethod, paidAmount = 0 } = req.body;

  const appt = await Appointment.findById(appointmentId).populate('patientId').populate('doctorId');
  if (!appt) throw AppError.notFound('Appointment not found');
  if (appt.status !== 'Completed') throw AppError.badRequest('Invoice can only be generated for completed appointments');

  const existing = await Invoice.findOne({ appointmentId }).lean();
  if (existing) throw AppError.conflict('Invoice already exists for this appointment');

  const { items, subtotal, discount, taxPercent, taxAmount, totalAmount } = buildAmounts(req.body.items, req.body.discount, req.body.taxPercent);
  const paid = Number(paidAmount || 0);

  if (paid > totalAmount) throw AppError.badRequest('Paid amount cannot exceed total amount');
  if (paymentStatus === 'Paid' && paid < totalAmount) throw AppError.badRequest('Mark as Partial if payment is incomplete');
  if (paymentStatus === 'Partial' && paid <= 0) throw AppError.badRequest('Enter amount paid for partial payment');

  const count = await Invoice.countDocuments();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const invoice = await Invoice.create({
    invoiceNumber,
    appointmentId: appt._id,
    patientId: resolveRefId(appt.patientId),
    doctorId: resolveRefId(appt.doctorId),
    items, subtotal, discount, taxPercent, taxAmount, totalAmount,
    paymentStatus,
    paymentMethod: paymentStatus !== 'Unpaid' ? paymentMethod : null,
    paidAmount: paymentStatus === 'Paid' ? totalAmount : paid,
    paidAt: paymentStatus === 'Paid' ? new Date() : null,
    notes: String(req.body.notes || '').trim(),
    generatedBy: req.user._id,
  });

  await auditFromReq(req, 'INVOICE_CREATED', `Invoice:${invoice._id}`, {
    invoiceNumber, totalAmount, patientId: appt.patientId._id,
  });

  notifyAdmins({ scopes: ['dashboard', 'billing'], reason: 'invoice_created' });

  const row = await enrichedInvoice(invoice._id);
  res.status(201).json({ success: true, data: row });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await findInvoiceOrFail(req.params.id);
  if (invoice.paymentStatus !== 'Unpaid') throw AppError.badRequest('Only unpaid invoices can be edited');

  const { items, subtotal, discount, taxPercent, taxAmount, totalAmount } = buildAmounts(req.body.items, req.body.discount, req.body.taxPercent);
  Object.assign(invoice, { items, subtotal, discount, taxPercent, taxAmount, totalAmount });
  invoice.notes = String(req.body.notes || invoice.notes || '').trim();
  await invoice.save();

  await auditFromReq(req, 'INVOICE_UPDATED', `Invoice:${invoice._id}`, { totalAmount });

  notifyAdmins({ scopes: ['dashboard', 'billing'], reason: 'invoice_updated' });

  const row = await enrichedInvoice(invoice._id);
  res.json({ success: true, data: row });
});

export const recordInvoicePayment = asyncHandler(async (req, res) => {
  const invoice = await findInvoiceOrFail(req.params.id);
  if (invoice.paymentStatus === 'Paid') throw AppError.badRequest('Invoice is already fully paid');

  const amountReceived = Number(req.body.amountReceived || 0);
  const outstanding = invoice.totalAmount - invoice.paidAmount;
  const paymentBounds = dayBoundsInPakistan(req.body.paymentDate);
  if (amountReceived <= 0) throw AppError.badRequest('Amount must be greater than 0');
  if (amountReceived > outstanding) throw AppError.badRequest(`Amount exceeds outstanding balance of Rs. ${outstanding}`);
  if (!paymentBounds) throw AppError.badRequest('Invalid payment date');

  invoice.paidAmount += amountReceived;
  invoice.paymentStatus = invoice.paidAmount >= invoice.totalAmount ? 'Paid' : 'Partial';
  if (invoice.paymentStatus === 'Paid') invoice.paidAt = new Date(req.body.paymentDate);
  invoice.paymentMethod = req.body.paymentMethod;

  if (req.body.notes) {
    invoice.notes = [invoice.notes, String(req.body.notes).trim()].filter(Boolean).join('\n').slice(0, 500);
  }
  await invoice.save();

  await auditFromReq(req, 'PAYMENT_RECORDED', `Invoice:${invoice._id}`, {
    amountReceived, newStatus: invoice.paymentStatus, newPaidAmount: invoice.paidAmount,
  });

  notifyAdmins({ scopes: ['dashboard', 'billing'], reason: 'payment_recorded' });

  const row = await enrichedInvoice(invoice._id);
  res.json({ success: true, data: row });
});

export const getPatientInvoices = asyncHandler(async (req, res) => {
  if (req.user.role === 'patient') {
    const patient = await resolvePatientForPortalUser(req.user, '_id');
    if (!patient || String(patient._id) !== String(req.params.patientId)) {
      throw AppError.forbidden('You are not allowed to view these invoices');
    }
  }

  const { page, limit, skip } = parsePagination(req.query);
  const invQuery = { patientId: req.params.patientId };
  const st = String(req.query.status || '').trim();
  if (st && ['Paid', 'Unpaid', 'Partial'].includes(st)) invQuery.paymentStatus = st;

  const [invoices, total] = await Promise.all([
    Invoice.find(invQuery)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name')
      .populate('generatedBy', 'name')
      .populate('appointmentId', 'date timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(invQuery),
  ]);

  const data = await attachSpecialization(invoices);
  res.json({ success: true, data: { invoices: data, pagination: paginationMeta(total, page, limit) } });
});

export const streamInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await populateInvoice(req.params.id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  await assertPatientOwnsInvoice(req, invoice);
  const [row] = await attachSpecialization(invoice);
  generateInvoicePDF(row, res);
});

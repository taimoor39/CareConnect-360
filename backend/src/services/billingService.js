import DoctorProfile from '../models/DoctorProfile.js';
import Invoice from '../models/Invoice.js';

import AppError from '../utils/AppError.js';
import { findPatientByUserId } from '../utils/patientLink.js';

export const buildAmounts = (rawItems = [], discountInput = 0, taxPercentInput = 0) => {
  const items = rawItems.map((i) => {
    const quantity = Math.max(1, Number(i.quantity || 1));
    const unitPrice = Math.max(0, Number(i.unitPrice || 0));
    return { description: String(i.description || '').trim(), quantity, unitPrice, total: quantity * unitPrice };
  });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discount = Math.max(0, Number(discountInput || 0));
  const taxPercent = Math.min(100, Math.max(0, Number(taxPercentInput || 0)));
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = (taxable * taxPercent) / 100;
  return { items, subtotal, discount, taxPercent, taxAmount, totalAmount: taxable + taxAmount };
};

export const populateInvoice = (id) =>
  Invoice.findById(id)
    .populate('patientId', 'name patientId phone email')
    .populate('doctorId', 'name')
    .populate('generatedBy', 'name')
    .populate('appointmentId', 'date timeSlot');

export const attachSpecialization = async (invoices) => {
  const docs = (Array.isArray(invoices) ? invoices : [invoices]).filter(Boolean);
  const doctorIds = docs.map((d) => d.doctorId?._id || d.doctorId).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean();
  const map = new Map(profiles.map((p) => [String(p.userId), p.specialization]));
  return docs.map((d) => {
    const row = d.toObject ? d.toObject() : d;
    return { ...row, doctorSpecialization: map.get(String(row.doctorId?._id || row.doctorId || '')) || '' };
  });
};

export const enrichedInvoice = async (id) => {
  const populated = await populateInvoice(id);
  const [row] = await attachSpecialization(populated);
  return row;
};

export const findInvoiceOrFail = async (id) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  return invoice;
};

export const assertPatientOwnsInvoice = async (req, invoiceDoc) => {
  if (req.user.role !== 'patient') return;
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  const pid = String(invoiceDoc.patientId?._id || invoiceDoc.patientId);
  if (!patient || pid !== String(patient._id)) {
    throw AppError.forbidden('You are not allowed to view this invoice');
  }
};

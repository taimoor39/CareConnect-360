import { body } from 'express-validator';

import DoctorProfile from '../models/DoctorProfile.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

import {
  APPOINTMENT_STATUS_UPDATES,
  dateRule,
  enumRule,
  mongoIdBody,
  mongoIdParam,
  textRule,
  timeSlotRule,
} from './common.js';

const APPOINTMENT_ID = { field: 'id', label: 'appointment ID' };

// ─── Domain-specific async validators ─────────────────────────────────────
const ensurePatientIsBookable = async (id) => {
  const patient = await Patient.findById(id).lean();
  if (!patient) throw new Error('Patient not found');
  if (patient.isArchived) throw new Error('Cannot book for an archived patient');
  return true;
};

const ensureDoctorIsBookable = async (id) => {
  const doctor = await User.findById(id).lean();
  if (!doctor || doctor.role !== 'doctor') throw new Error('Doctor not found');
  if (!doctor.isActive) throw new Error('Doctor is not currently active');

  const profile = await DoctorProfile.findOne({ userId: id }).lean();
  if (!profile || !profile.isProfileComplete) throw new Error('Doctor profile is incomplete');
  return true;
};

const ensureSlotInsideWorkingHours = async (slot, { req }) => {
  const profile = await DoctorProfile.findOne({ userId: req.body.doctorId }).lean();
  if (!profile) throw new Error('Doctor profile not found');

  const [slotStart] = String(slot).split('-');
  const { shiftStart, shiftEnd } = profile.schedule ?? {};
  if (!shiftStart || !shiftEnd) throw new Error('Doctor schedule is not configured');

  if (slotStart < shiftStart || slotStart >= shiftEnd) {
    throw new Error('Time slot is outside doctor working hours');
  }
  return true;
};

// ─── Validators ───────────────────────────────────────────────────────────
export const createAppointmentValidator = [
  mongoIdBody('patientId', { label: 'patient ID' }).bail().custom(ensurePatientIsBookable),
  mongoIdBody('doctorId', { label: 'doctor ID' }).bail().custom(ensureDoctorIsBookable),
  dateRule('date', { optional: false, noPast: true, label: 'Appointment date' }),
  timeSlotRule('timeSlot', { label: 'Time slot' }).custom(ensureSlotInsideWorkingHours),
  textRule('reasonForVisit', { max: 200, optional: true, label: 'Reason for visit' }),
  textRule('notes', { max: 500, optional: true, label: 'Notes' }),
  mongoIdBody('rescheduledFrom', { label: 'rescheduled appointment ID', optional: true }),
];

export const updateStatusValidator = [
  mongoIdParam(APPOINTMENT_ID.field, APPOINTMENT_ID.label),
  enumRule('status', APPOINTMENT_STATUS_UPDATES, { label: 'Status' }),
  body('cancellationReason')
    .if(body('status').equals('Cancelled'))
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isLength({ min: 10 })
    .withMessage('Cancellation reason must be at least 10 characters'),
];

export const checkInValidator = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
];

import { body, param, query } from 'express-validator';
import { dayBoundsInPakistan, isISODateOnly, toPakistanISODate } from '../utils/dateTime.js';

const validateFutureFollowUp = (date) => {
  if (!isISODateOnly(date)) throw new Error('Follow-up date must be in YYYY-MM-DD format');
  const bounds = dayBoundsInPakistan(date);
  if (!bounds) throw new Error('Follow-up date must be a valid date');
  if (bounds.isoDate <= toPakistanISODate(new Date())) {
    throw new Error('Follow-up date must be in the future');
  }
  return true;
};

export const consultationValidator = [
  body('appointmentId').notEmpty().withMessage('Appointment ID is required').isMongoId().withMessage('Invalid appointment ID'),
  body('consultationNotes')
    .notEmpty()
    .withMessage('Consultation notes required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Consultation notes must be between 10 and 5000 characters'),
  body('symptoms').optional().isLength({ max: 2000 }).withMessage('Symptoms can be at most 2000 characters'),
  body('diagnosis').optional().isLength({ max: 2000 }).withMessage('Diagnosis can be at most 2000 characters'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Follow-up date must be a valid date')
    .custom(validateFutureFollowUp),
];

const validateConsultationNotesLength = (value, { req }) => {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (!text) return true;
  const finalize = req.body.isDraft === false || req.body.isDraft === 'false';
  const min = finalize ? 10 : 1;
  if (text.length < min || text.length > 5000) {
    throw new Error(
      finalize
        ? 'Consultation notes must be between 10 and 5000 characters'
        : 'Consultation notes must be between 1 and 5000 characters',
    );
  }
  return true;
};

export const updateConsultationValidator = [
  param('id').optional().isMongoId().withMessage('Invalid consultation ID'),
  param('appointmentId').optional().isMongoId().withMessage('Invalid appointment ID'),
  body('consultationNotes').optional().custom(validateConsultationNotesLength),
  body('symptoms').optional().isLength({ max: 2000 }).withMessage('Symptoms can be at most 2000 characters'),
  body('diagnosis').optional().isLength({ max: 2000 }).withMessage('Diagnosis can be at most 2000 characters'),
  body('followUpDate')
    .optional({ values: 'null' })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      const raw = String(value).slice(0, 10);
      if (!isISODateOnly(raw)) {
        throw new Error('Follow-up date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  body('prescription.items').optional().isArray({ min: 1 }).withMessage('At least one medicine required'),
  body('prescription.items.*.medicineName')
    .optional()
    .isLength({ min: 2, max: 200 }),
  body('prescription.items.*.dosage').optional().notEmpty().isLength({ max: 100 }),
  body('prescription.items.*.frequency')
    .optional()
    .isIn(['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Other']),
  body('prescription.items.*.duration').optional().notEmpty().isLength({ max: 100 }),
  body('medicalReport.title')
    .optional()
    .custom((value, { req }) => {
      const report = req.body.medicalReport;
      if (!report?.originalText && !report?.title) return true;
      const title = String(value || report?.title || '').trim();
      if (title.length >= 2) return true;
      if (String(report?.originalText || '').trim()) return true;
      throw new Error('Report title must be at least 2 characters');
    }),
  body('medicalReport.fileType').optional().isIn(['text', 'pdf']),
  body('medicalReport.originalText')
    .optional()
    .custom((value, { req }) => {
      if (req.file) return true;
      const report = req.body.medicalReport;
      if (!report?.title && !report?.originalText) return true;
      if (report.fileType === 'pdf') return true;
      const text = String(value || '').trim();
      if (!text) {
        throw new Error('Report text is required for text reports');
      }
      if (text.length < 10) {
        throw new Error('Report text must be at least 10 characters');
      }
      if (text.length > 10000) {
        throw new Error('Report text can be at most 10000 characters');
      }
      return true;
    }),
];

export const prescriptionValidator = [
  body('consultationId').notEmpty().isMongoId().withMessage('Valid consultation ID required'),
  body('patientId').notEmpty().isMongoId().withMessage('Valid patient ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one medicine required'),
  body('items.*.medicineName')
    .notEmpty()
    .withMessage('Medicine name required')
    .isLength({ min: 2, max: 200 }),
  body('items.*.dosage').notEmpty().withMessage('Dosage required').isLength({ max: 100 }),
  body('items.*.frequency')
    .notEmpty()
    .isIn(['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Other']),
  body('items.*.duration').notEmpty().withMessage('Duration required').isLength({ max: 100 }),
];

export const reportValidator = [
  body('title').notEmpty().withMessage('Report title required').isLength({ min: 2, max: 200 }),
  body('patientId').optional().isMongoId().withMessage('Valid patient ID required'),
  body('originalText')
    .custom((value, { req }) => {
      if (req.file) return true;
      const text = String(value || '').trim();
      if (text.length < 100) {
        throw new Error('Report too short (min 100 characters)');
      }
      if (text.length > 10000) {
        throw new Error('Report text can be at most 10000 characters');
      }
      return true;
    }),
];

export const scheduleQueryValidator = [
  query('from').optional().isISO8601().withMessage('Invalid from date'),
  query('to').optional().isISO8601().withMessage('Invalid to date'),
  query('status').optional().isIn(['Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Missed', 'Cancelled']),
];

export const objectIdParamValidator = [
  param('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
  param('id').optional().isMongoId().withMessage('Invalid ID'),
];

export const appointmentIdParamValidator = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
];


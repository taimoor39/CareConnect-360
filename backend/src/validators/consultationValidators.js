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

export const updateConsultationValidator = [
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  body('consultationNotes')
    .optional()
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
  body('patientId').notEmpty().isMongoId().withMessage('Valid patient ID required'),
  body('originalText')
    .if(body('fileType').equals('text'))
    .notEmpty()
    .withMessage('Report text required')
    .isLength({ min: 100, max: 10000 })
    .withMessage('Report too short (min 100 characters)'),
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


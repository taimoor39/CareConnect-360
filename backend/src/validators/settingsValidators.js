import { body, param, query } from 'express-validator';

const TEMPLATE_KEYS = [
  'appointmentReminder',
  'missedAppointment',
  'prescriptionRenewal',
  'reEngagement',
  'aiSummaryReady',
];

const JOB_NAMES = ['appointmentReminder', 'patientReEngagement', 'prescriptionRenewal'];

export const securityValidator = [
  body('jwtExpiryHours')
    .optional()
    .isInt({ min: 1, max: 720 })
    .withMessage('JWT expiry must be 1–720 hours'),
  body('minPasswordLength')
    .optional()
    .isInt({ min: 6, max: 32 })
    .withMessage('Min password length: 6–32 characters'),
  body('maxLoginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Login attempts: 3–10'),
  body('fileUploadLimitMB')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('File limit: 1–50 MB'),
  body('corsAllowedOrigin')
    .optional()
    .custom((v) => {
      if (v === '*') return true;
      try { new URL(v); return true; } catch { throw new Error('Must be valid URL or *'); }
    }),
];

export const emailValidator = [
  body('smtpHost').notEmpty().withMessage('SMTP host required').isLength({ min: 3 }),
  body('smtpPort').notEmpty().isInt({ min: 1, max: 65535 }).withMessage('Port: 1–65535'),
  body('smtpUser').notEmpty().isEmail().withMessage('Valid email required'),
  body('fromName').notEmpty().isLength({ min: 2, max: 100 }),
  body('fromEmail').notEmpty().isEmail().withMessage('Valid email required'),
  body('replyTo').optional({ values: 'falsy' }).isEmail().withMessage('Must be valid email if provided'),
  body('smtpEncryption').optional().isIn(['none', 'ssl', 'tls']),
];

export const emailTemplateValidator = [
  body('templateKey').isIn(TEMPLATE_KEYS).withMessage('Invalid template key'),
  body('subject').optional().isString().isLength({ min: 1, max: 300 }),
  body('body').optional().isString().isLength({ max: 20000 }),
];

export const cronJobsValidator = [
  body('appointmentReminder.schedule').optional().isString().trim().notEmpty(),
  body('patientReEngagement.schedule').optional().isString().trim().notEmpty(),
  body('prescriptionRenewal.schedule').optional().isString().trim().notEmpty(),
  body('appointmentReminder.enabled').optional().isBoolean(),
  body('patientReEngagement.enabled').optional().isBoolean(),
  body('prescriptionRenewal.enabled').optional().isBoolean(),
];

export const clinicValidator = [
  body('name').notEmpty().withMessage('Clinic name required').isLength({ min: 2, max: 100 }),
  body('phone').notEmpty().withMessage('Phone required').matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone format'),
  body('email').notEmpty().isEmail().withMessage('Valid email required'),
  body('website')
    .optional({ values: 'falsy' })
    .custom((v) => {
      if (!v) return true;
      try { new URL(v); return true; } catch { throw new Error('Invalid URL'); }
    }),
  body('defaultTaxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate: 0–100%'),
  body('invoicePrefix').optional().isLength({ max: 5 }).matches(/^[A-Z0-9]+$/).withMessage('Uppercase letters and numbers only, max 5'),
  body('workingHours')
    .optional()
    .isArray()
    .custom((hours) => {
      hours.forEach((h) => {
        if (h.isOpen && h.start >= h.end) throw new Error(`${h.day}: End time must be after start time`);
      });
      return true;
    }),
];

export const aiServiceValidator = [
  body('url')
    .notEmpty()
    .withMessage('AI service URL required')
    .custom((v) => {
      try { new URL(v); return true; } catch { throw new Error('Invalid URL'); }
    }),
  body('timeoutSeconds').optional().isInt({ min: 5, max: 120 }).withMessage('Timeout: 5–120 seconds'),
  body('maxReportLength').optional().isInt({ min: 500, max: 50000 }).withMessage('Max length: 500–50,000 characters'),
];

export const medicalTermValidator = [
  body('medicalTerm').notEmpty().withMessage('Medical term required').isLength({ min: 2, max: 100 }).trim(),
  body('simplifiedTerm').notEmpty().withMessage('Simplified term required').isLength({ min: 2, max: 200 }).trim(),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .notEmpty().withMessage('New password required')
    .isLength({ min: 8 }).withMessage('Minimum 8 characters')
    .matches(/[A-Z]/).withMessage('Must include uppercase')
    .matches(/[0-9]/).withMessage('Must include number'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm new password')
    .custom((confirm, { req }) => {
      if (confirm !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

export const runJobValidator = [
  param('jobName').isIn(JOB_NAMES).withMessage('Invalid job name'),
];

export const medicalTermsListValidator = [
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const medicalTermIdValidator = [
  param('id').isMongoId().withMessage('Invalid medical term id'),
];

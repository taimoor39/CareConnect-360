import { param, query } from 'express-validator';
import { dayBoundsInPakistan, toPakistanISODate } from '../utils/dateTime.js';

const ROLE_VALUES = ['admin', 'doctor', 'receptionist', 'patient', 'system'];
const TARGET_COLLECTIONS = [
  'users',
  'patients',
  'appointments',
  'invoices',
  'doctorProfiles',
  'engagementLogs',
  'auditLogs',
  'consultations',
  'reports',
];

export const getAuditLogsValidator = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage("'from' must be a valid date (YYYY-MM-DD)"),

  query('to')
    .optional()
    .isISO8601()
    .withMessage("'to' must be a valid date (YYYY-MM-DD)")
    .custom((to, { req }) => {
      const toBounds = dayBoundsInPakistan(to);
      if (!toBounds) throw new Error("'to' must be a valid date (YYYY-MM-DD)");
      if (req.query.from) {
        const fromBounds = dayBoundsInPakistan(req.query.from);
        if (!fromBounds) throw new Error("'from' must be a valid date (YYYY-MM-DD)");
        if (toBounds.isoDate < fromBounds.isoDate) {
          throw new Error("'to' cannot be before 'from'");
        }
      }
      if (toBounds.isoDate > toPakistanISODate(new Date())) {
        throw new Error("'to' cannot be in the future");
      }
      return true;
    }),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage("sortOrder must be 'asc' or 'desc'"),

  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format'),

  query('role')
    .optional()
    .isIn(ROLE_VALUES)
    .withMessage('Invalid role value'),

  query('targetCollection')
    .optional()
    .isIn(TARGET_COLLECTIONS)
    .withMessage('Invalid collection name'),
];

export const getAuditLogByIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid audit log ID'),
];

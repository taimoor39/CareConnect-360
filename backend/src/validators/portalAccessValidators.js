import { body, param } from 'express-validator';

import Patient from '../models/Patient.js';
import User from '../models/User.js';

export const createRequestValidator = [
  body('patientId')
    .notEmpty().withMessage('Patient ID required')
    .isMongoId().withMessage('Invalid patient ID')
    .custom(async (id) => {
      const patient = await Patient.findById(id);
      if (!patient) throw new Error('Patient not found');
      if (patient.isArchived) throw new Error('Cannot request for archived patient');
      if (patient.userId) throw new Error('Patient already has portal access');
      return true;
    }),
  body('requestedEmail')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .custom(async (email) => {
      const taken = await User.findOne({ email: String(email).toLowerCase() }).lean();
      if (taken) throw new Error('This email is already registered in the system');
      return true;
    }),
];

export const rejectRequestValidator = [
  param('id')
    .isMongoId().withMessage('Invalid request ID'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason max 500 characters'),
];

export const updateEmailValidator = [
  param('id')
    .isMongoId().withMessage('Invalid request ID'),
  body('newEmail')
    .notEmpty().withMessage('Email required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .custom(async (email) => {
      const taken = await User.findOne({ email: String(email).toLowerCase() }).lean();
      if (taken) throw new Error('Email already in use');
      return true;
    }),
];

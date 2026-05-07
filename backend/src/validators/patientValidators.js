import { body } from 'express-validator';

import {
  BLOOD_GROUPS,
  GENDERS,
  PATIENT_STATUSES,
  emailRule,
  enumRule,
  mongoIdParam,
  nameRule,
  phoneRule,
} from './common.js';

const PATIENT_ID = { field: 'id', label: 'patient ID' };

const dobRule = (optional = false) => {
  const chain = optional
    ? body('dateOfBirth').optional({ values: 'falsy' })
    : body('dateOfBirth').notEmpty().withMessage('Date of birth is required');

  return chain
    .isISO8601()
    .withMessage('Invalid date of birth')
    .custom((dob) => {
      const ageMs = Date.now() - new Date(dob).getTime();
      const ageYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
      if (ageYears < 0 || ageYears > 150) throw new Error('Invalid date of birth');
      return true;
    });
};

// Patient password is optional by design (portal account creation is opt-in).
const optionalPatientPassword = body('password')
  .optional({ values: 'falsy' })
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters');

export const createPatientValidator = [
  nameRule('firstName', { label: 'First name', lettersOnly: true }),
  nameRule('lastName', { label: 'Last name' }),
  phoneRule('phone'),
  emailRule('email', { optional: true }),
  optionalPatientPassword,
  dobRule(false),
  enumRule('gender', GENDERS, { label: 'Gender' }),
  enumRule('bloodGroup', BLOOD_GROUPS, { optional: true, label: 'Blood group' }),
  enumRule('status', PATIENT_STATUSES, { optional: true, label: 'Status' }),
];

export const updatePatientValidator = [
  mongoIdParam(PATIENT_ID.field, PATIENT_ID.label),
  nameRule('firstName', { optional: true, label: 'First name', lettersOnly: true }),
  nameRule('lastName', { optional: true, label: 'Last name' }),
  phoneRule('phone', { optional: true }),
  emailRule('email', { optional: true }),
  optionalPatientPassword,
  dobRule(true),
  enumRule('gender', GENDERS, { optional: true, label: 'Gender' }),
  enumRule('bloodGroup', BLOOD_GROUPS, { optional: true, label: 'Blood group' }),
  enumRule('status', PATIENT_STATUSES, { optional: true, label: 'Status' }),
];

export const patientIdValidator = [mongoIdParam(PATIENT_ID.field, PATIENT_ID.label)];

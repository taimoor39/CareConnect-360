import { body } from 'express-validator';

import {
  booleanRule,
  emailRule,
  mongoIdParam,
  nameRule,
  passwordRule,
  phoneRule,
  scheduleRules,
  textRule,
} from './common.js';

const DOCTOR_ID = { field: 'id', label: 'doctor ID' };

// NOTE: Email uniqueness is enforced by the doctor controller (with 409 on
// conflict). Keeping it out of the validator avoids a redundant DB round-trip
// and ensures a consistent HTTP status code across the API.

export const createDoctorValidator = [
  nameRule('firstName', { label: 'First name', lettersOnly: true }),
  nameRule('lastName', { label: 'Last name' }),
  emailRule('email'),
  phoneRule('phone'),
  passwordRule('password'),
  textRule('specialization', { min: 2, max: 100, optional: false, label: 'Specialization' }),
  textRule('qualification', { min: 2, max: 200, optional: false, label: 'Qualification' }),
  ...scheduleRules('schedule', { optional: false }),
];

export const updateDoctorValidator = [
  mongoIdParam(DOCTOR_ID.field, DOCTOR_ID.label),
  nameRule('firstName', { optional: true, label: 'First name', lettersOnly: true }),
  nameRule('lastName', { optional: true, label: 'Last name' }),
  emailRule('email', { optional: true }),
  phoneRule('phone', { optional: true }),
  passwordRule('password', { optional: true }),
  textRule('specialization', { min: 2, max: 100, optional: true, label: 'Specialization' }),
  textRule('qualification', { min: 2, max: 200, optional: true, label: 'Qualification' }),
  ...scheduleRules('schedule', { optional: true }),
  booleanRule('isActive', { optional: true, label: 'isActive' }),
];

export const scheduleValidator = [
  mongoIdParam(DOCTOR_ID.field, DOCTOR_ID.label),
  ...scheduleRules('', { optional: false }),
];

/** Doctor portal self-service profile (phone + bio only). */
export const updateDoctorProfileValidator = [
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Phone must be 10-15 digits only'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('name').not().exists().withMessage('Name cannot be changed from profile. Contact admin.'),
  body('email').not().exists().withMessage('Email cannot be changed here. Contact admin.'),
  body('specialization').not().exists().withMessage('Specialization is managed by admin.'),
  body('qualification').not().exists().withMessage('Qualification is managed by admin.'),
  body('schedule').not().exists().withMessage('Schedule is managed by admin.'),
];

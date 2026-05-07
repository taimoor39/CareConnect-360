import { body, param } from 'express-validator';
import { dayBoundsInPakistan, isISODateOnly, toPakistanISODate } from '../utils/dateTime.js';

// ─── Shared enums ─────────────────────────────────────────────────────────
export const ROLES = Object.freeze(['admin', 'doctor', 'receptionist', 'patient']);
export const DAYS_OF_WEEK = Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export const GENDERS = Object.freeze(['Male', 'Female', 'Other']);
export const BLOOD_GROUPS = Object.freeze(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
export const PATIENT_STATUSES = Object.freeze(['Active', 'Inactive', 'Discharged']);
export const APPOINTMENT_STATUSES = Object.freeze([
  'Scheduled',
  'Checked-In',
  'In-Progress',
  'Completed',
  'Missed',
  'Cancelled',
]);
export const APPOINTMENT_STATUS_UPDATES = Object.freeze([
  'Checked-In',
  'In-Progress',
  'Completed',
  'Cancelled',
]);
export const PAYMENT_STATUSES = Object.freeze(['Paid', 'Unpaid', 'Partial']);
export const PAYMENT_METHODS = Object.freeze(['Cash', 'Card', 'Online', 'Insurance']);

// ─── Shared regex patterns ────────────────────────────────────────────────
export const REGEX = Object.freeze({
  name: /^[a-zA-Z\s]+$/,
  phone: /^[0-9]{10,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  time24: /^([01]\d|2[0-3]):[0-5]\d$/,
  timeSlot: /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/,
});

// ─── Internal helpers ─────────────────────────────────────────────────────
const rangeLabel = (min, max) => {
  if (min !== undefined && max !== undefined) return `between ${min} and ${max}`;
  if (min !== undefined) return `at least ${min}`;
  return `at most ${max}`;
};

const applyPresence = (chain, { optional, allowFalsy, label }) => {
  if (optional) return allowFalsy ? chain.optional({ values: 'falsy' }) : chain.optional();
  return chain.notEmpty().withMessage(`${label} is required`);
};

// ─── Joi-like rule builders ───────────────────────────────────────────────

/** MongoId validator for a URL param. */
export const mongoIdParam = (field = 'id', label = 'ID') =>
  param(field).isMongoId().withMessage(`Invalid ${label}`);

/** MongoId validator for a body field (required by default, set optional:true to skip). */
export const mongoIdBody = (field, { label = field, optional = false } = {}) => {
  const chain = applyPresence(body(field), { optional, allowFalsy: false, label });
  return chain.isMongoId().withMessage(`Invalid ${label}`);
};

/** Human name: trim, 2–30 chars, optional letters-only. */
export const nameRule = (
  field,
  { optional = false, label, min = 2, max = 30, lettersOnly = false } = {}
) => {
  const heading = label ?? field;
  const chain = applyPresence(body(field).trim(), { optional, allowFalsy: true, label: heading })
    .isLength({ min, max })
    .withMessage(`${heading} must be ${min}–${max} characters`);
  return lettersOnly
    ? chain.matches(REGEX.name).withMessage(`${heading} may contain letters and spaces only`)
    : chain;
};

/** Email rule with optional uniqueness hook. */
export const emailRule = (
  field = 'email',
  { optional = false, unique = null } = {}
) => {
  const chain = applyPresence(body(field), { optional, allowFalsy: true, label: 'Email' })
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail();

  if (typeof unique !== 'function') return chain;

  return chain.custom(async (email, meta) => {
    const duplicate = await unique(email, meta);
    if (duplicate) throw new Error('Email is already in use');
    return true;
  });
};

/** 10–15 digit phone rule. */
export const phoneRule = (field = 'phone', { optional = false } = {}) =>
  applyPresence(body(field), { optional, allowFalsy: true, label: 'Phone' })
    .matches(REGEX.phone)
    .withMessage('Phone must contain 10–15 digits only');

/** Strong password rule (min 8, 1 upper, 1 lower, 1 digit). */
export const passwordRule = (field = 'password', { optional = false } = {}) =>
  applyPresence(body(field), { optional, allowFalsy: true, label: 'Password' })
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(REGEX.password)
    .withMessage('Password must include uppercase, lowercase, and a number');

/** 24h HH:MM time rule. */
export const timeRule = (field, { optional = false, label } = {}) => {
  const heading = label ?? field;
  return applyPresence(body(field), { optional, allowFalsy: false, label: heading })
    .matches(REGEX.time24)
    .withMessage(`${heading} must match HH:MM (24-hour)`);
};

/** HH:MM-HH:MM time slot rule. */
export const timeSlotRule = (field, { optional = false, label } = {}) => {
  const heading = label ?? field;
  return applyPresence(body(field), { optional, allowFalsy: false, label: heading })
    .matches(REGEX.timeSlot)
    .withMessage(`${heading} must match HH:MM-HH:MM (24-hour)`);
};

/** Bounded integer rule. */
export const integerRule = (field, { min, max, optional = true, label } = {}) => {
  const heading = label ?? field;
  const opts = {};
  if (min !== undefined) opts.min = min;
  if (max !== undefined) opts.max = max;

  return applyPresence(body(field), { optional, allowFalsy: false, label: heading })
    .isInt(opts)
    .withMessage(`${heading} must be ${rangeLabel(min, max)}`);
};

/** Bounded float rule. */
export const floatRule = (field, { min, max, optional = true, label } = {}) => {
  const heading = label ?? field;
  const opts = {};
  if (min !== undefined) opts.min = min;
  if (max !== undefined) opts.max = max;

  return applyPresence(body(field), { optional, allowFalsy: false, label: heading })
    .isFloat(opts)
    .withMessage(`${heading} must be ${rangeLabel(min, max)}`);
};

/** Enum rule (isIn). Optional fields accept empty strings. */
export const enumRule = (field, values, { optional = false, label } = {}) => {
  const heading = label ?? field;
  return applyPresence(body(field), { optional, allowFalsy: true, label: heading })
    .isIn(values)
    .withMessage(`${heading} must be one of: ${values.join(', ')}`);
};

/** Boolean rule. */
export const booleanRule = (field, { optional = true, label } = {}) => {
  const heading = label ?? field;
  return applyPresence(body(field), { optional, allowFalsy: false, label: heading })
    .isBoolean()
    .withMessage(`${heading} must be a boolean`);
};

/** Free-text / notes rule — trimmed, with optional min/max length. */
export const textRule = (field, { min, max = 500, optional = true, label } = {}) => {
  const heading = label ?? field;
  const lengthOpts = { max };
  if (min !== undefined) lengthOpts.min = min;

  const message =
    min !== undefined
      ? `${heading} must be ${min}–${max} characters`
      : `${heading} must not exceed ${max} characters`;

  return applyPresence(body(field).trim(), { optional, allowFalsy: true, label: heading })
    .isLength(lengthOpts)
    .withMessage(message);
};

/**
 * ISO-8601 date rule with optional past/future guards.
 * - noFuture: reject dates in the future (compared to now).
 * - noPast:   reject dates before today (start-of-day).
 */
export const dateRule = (field, { optional = false, noFuture = false, noPast = false, label } = {}) => {
  const heading = label ?? field;
  let chain = applyPresence(body(field), { optional, allowFalsy: true, label: heading })
    .isISO8601()
    .withMessage(`${heading} must be a valid date`);

  if (noFuture) {
    chain = chain.custom((value) => {
      const supplied = dayBoundsInPakistan(value);
      if (!supplied) throw new Error(`${heading} is not a valid date`);
      const todayIso = toPakistanISODate(new Date());
      if (supplied.isoDate > todayIso) throw new Error(`${heading} cannot be in the future`);
      return true;
    });
  }

  if (noPast) {
    chain = chain.custom((value) => {
      const supplied = dayBoundsInPakistan(value);
      if (!supplied) throw new Error(`${heading} is not a valid date`);
      const todayIso = toPakistanISODate(new Date());
      if (supplied.isoDate < todayIso) throw new Error(`${heading} cannot be in the past`);
      return true;
    });
  }

  chain = chain.custom((value) => {
    if (!isISODateOnly(value)) throw new Error(`${heading} must be in ISO 8601 date format (YYYY-MM-DD)`);
    return true;
  });

  return chain;
};

/**
 * Doctor working-hours schedule rules.
 * `prefix` is the nesting path (e.g. 'schedule' or '' for a flat body).
 */
export const scheduleRules = (prefix = 'schedule', { optional = false } = {}) => {
  const path = (suffix) => (prefix ? `${prefix}.${suffix}` : suffix);

  const daysChain = body(path('days'));
  const daysRule = (optional ? daysChain.optional() : daysChain)
    .isArray({ min: 1 })
    .withMessage('Select at least 1 working day')
    .bail()
    .custom((days) => days.every((day) => DAYS_OF_WEEK.includes(day)))
    .withMessage(`Invalid day value — allowed: ${DAYS_OF_WEEK.join(', ')}`);

  const shiftEndChain = timeRule(path('shiftEnd'), { optional, label: 'Shift end' }).custom(
    (end, { req }) => {
      const start = prefix ? req.body?.[prefix]?.shiftStart : req.body?.shiftStart;
      if (!start || !end) return true;
      if (end <= start) throw new Error('Shift end must be after shift start');
      return true;
    }
  );

  return [
    daysRule,
    timeRule(path('shiftStart'), { optional, label: 'Shift start' }),
    shiftEndChain,
    integerRule(path('maxPatientsPerDay'), { min: 1, max: 100, optional: true, label: 'Max patients per day' }),
    integerRule(path('consultationDurationMins'), { min: 10, max: 120, optional: true, label: 'Consultation duration (mins)' }),
  ];
};

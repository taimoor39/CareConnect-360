import {
  booleanRule,
  mongoIdParam,
  nameRule,
  phoneRule,
  textRule,
} from './common.js';

const STAFF_ID = { field: 'id', label: 'staff ID' };

export const updateStaffValidator = [
  mongoIdParam(STAFF_ID.field, STAFF_ID.label),
  nameRule('firstName', { optional: true, label: 'First name', lettersOnly: true }),
  nameRule('lastName', { optional: true, label: 'Last name' }),
  phoneRule('phone', { optional: true }),
  textRule('notes', { max: 500, optional: true, label: 'Notes' }),
  booleanRule('isActive', { optional: true, label: 'isActive' }),
];

import { body, query } from 'express-validator';

import {
  ROLES,
  booleanRule,
  emailRule,
  enumRule,
  mongoIdParam,
  nameRule,
  passwordRule,
  phoneRule,
} from './common.js';

const USER_ID = { field: 'id', label: 'user ID' };

export const createUserValidator = [
  nameRule('name', { label: 'Name', max: 50 }),
  emailRule('email'),
  passwordRule('password'),
  phoneRule('phone'),
  enumRule('role', ROLES, { label: 'Role' }),
];

export const updateUserValidator = [
  mongoIdParam(USER_ID.field, USER_ID.label),
  nameRule('name', { optional: true, label: 'Name', max: 50 }),
  emailRule('email', { optional: true }),
  passwordRule('password', { optional: true }),
  phoneRule('phone', { optional: true }),
  enumRule('role', ROLES, { optional: true, label: 'Role' }),
];

export const changeRoleValidator = [
  mongoIdParam(USER_ID.field, USER_ID.label),
  enumRule('role', ROLES, { label: 'Role' }),
];

export const toggleStatusValidator = [
  mongoIdParam(USER_ID.field, USER_ID.label),
  booleanRule('isActive', { optional: true, label: 'isActive' }),
];

export const userIdValidator = [mongoIdParam(USER_ID.field, USER_ID.label)];

export const setTempPasswordValidator = [
  mongoIdParam(USER_ID.field, USER_ID.label),
  body('temporaryPassword')
    .notEmpty()
    .withMessage('Temporary password is required')
    .isLength({ min: 8 })
    .withMessage('Minimum 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Must include uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Must include a number'),
];

export const listUsersQueryValidator = [
  query('name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name search must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name search can contain letters, spaces, apostrophes, and hyphens only'),
];

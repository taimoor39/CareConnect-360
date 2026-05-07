import { body, param } from 'express-validator';

export const verifyResetTokenValidator = [
  param('token')
    .notEmpty()
    .withMessage('Token is required')
    .matches(/^[a-f0-9]{64}$/i)
    .withMessage('Invalid reset token'),
];

export const forgotPasswordValidator = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

export const resetPasswordValidator = [
  param('token')
    .notEmpty()
    .withMessage('Token is required')
    .matches(/^[a-f0-9]{64}$/i)
    .withMessage('Invalid reset token'),
  body('newPassword')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Minimum 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Must include uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Must include a number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

export const changeRequiredPasswordValidator = [
  body('newPassword')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Minimum 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Must include uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Must include a number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

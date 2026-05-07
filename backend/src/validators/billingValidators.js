import { body } from 'express-validator';

import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  dateRule,
  enumRule,
  floatRule,
  mongoIdBody,
  mongoIdParam,
  textRule,
} from './common.js';

const INVOICE_ID = { field: 'id', label: 'invoice ID' };

// Each row in `items[]` — structural validation (not reachable via the generic
// `body('items.*.x')` helpers in common.js, so we keep these inline).
const itemValidators = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one billing item is required'),
  body('items.*.description')
    .trim()
    .notEmpty()
    .withMessage('Item description is required')
    .isLength({ max: 200 })
    .withMessage('Item description must not exceed 200 characters'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice')
    .notEmpty()
    .withMessage('Unit price is required')
    .isFloat({ min: 0 })
    .withMessage('Unit price cannot be negative'),
];

export const createInvoiceValidator = [
  mongoIdBody('appointmentId', { label: 'appointment ID' }),
  ...itemValidators,
  floatRule('discount', { min: 0, optional: true, label: 'Discount' }),
  floatRule('taxPercent', { min: 0, max: 100, optional: true, label: 'Tax percent' }),
  enumRule('paymentStatus', PAYMENT_STATUSES, { label: 'Payment status' }),

  // Require paymentMethod when the invoice is Paid or Partial.
  body('paymentMethod')
    .if(body('paymentStatus').not().equals('Unpaid'))
    .notEmpty()
    .withMessage('Payment method is required when recording a payment')
    .isIn(PAYMENT_METHODS)
    .withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`),

  // Require a positive paidAmount when paymentStatus is Partial.
  body('paidAmount')
    .if(body('paymentStatus').equals('Partial'))
    .notEmpty()
    .withMessage('Paid amount is required for partial payment')
    .isFloat({ min: 0.01 })
    .withMessage('Paid amount must be greater than 0'),

  textRule('notes', { max: 500, optional: true, label: 'Notes' }),
];

export const recordPaymentValidator = [
  mongoIdParam(INVOICE_ID.field, INVOICE_ID.label),
  floatRule('amountReceived', { min: 0.01, optional: false, label: 'Amount received' }),
  enumRule('paymentMethod', PAYMENT_METHODS, { label: 'Payment method' }),
  dateRule('paymentDate', { optional: false, noFuture: true, label: 'Payment date' }),
];

export const invoiceIdValidator = [mongoIdParam(INVOICE_ID.field, INVOICE_ID.label)];

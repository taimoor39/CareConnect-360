import { Router } from 'express';

import {
  createInvoice,
  getBillingStats,
  getCompletedAppointments,
  getInvoiceByAppointment,
  getInvoiceById,
  getPatientInvoices,
  getRevenueSummary,
  listInvoices,
  recordInvoicePayment,
  streamInvoicePdf,
  updateInvoice,
} from '../controllers/billingController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createInvoiceValidator, invoiceIdValidator, recordPaymentValidator } from '../validators/billingValidators.js';

const router = Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'receptionist', 'patient'), listInvoices);
router.get('/stats', authorizeRoles('admin'), getBillingStats);
router.get('/revenue-summary', authorizeRoles('admin'), getRevenueSummary);
router.get('/appointment/:appointmentId', authorizeRoles('admin', 'receptionist'), getInvoiceByAppointment);
router.get('/completed-appointments', authorizeRoles('admin', 'receptionist'), getCompletedAppointments);
router.get('/patient/:patientId', authorizeRoles('admin', 'receptionist', 'patient'), getPatientInvoices);
router.get('/:id/pdf', authorizeRoles('admin', 'receptionist', 'patient'), invoiceIdValidator, validate, streamInvoicePdf);
router.get('/:id', authorizeRoles('admin', 'receptionist', 'patient'), invoiceIdValidator, validate, getInvoiceById);
router.post('/', authorizeRoles('admin', 'receptionist'), createInvoiceValidator, validate, createInvoice);
router.put('/:id', authorizeRoles('admin'), invoiceIdValidator, createInvoiceValidator, validate, updateInvoice);
router.put('/:id/payment', authorizeRoles('admin', 'receptionist'), recordPaymentValidator, validate, recordInvoicePayment);

export default router;

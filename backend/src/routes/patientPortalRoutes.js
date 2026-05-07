import { Router } from 'express';

import {
  getPatientDashboardStats,
  getPatientProfile,
  getPatientReportSummary,
  listPatientAppointments,
  listPatientInvoices,
  listPatientPrescriptions,
  listPatientReports,
  updatePatientProfile,
} from '../controllers/patientPortalController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { patientReportIdValidator, updateProfileValidator } from '../validators/patientPortalValidators.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('patient'));

router.get('/dashboard-stats', getPatientDashboardStats);
router.get('/appointments', listPatientAppointments);
router.get('/prescriptions', listPatientPrescriptions);
router.get('/reports', listPatientReports);
router.get('/reports/:reportId/summary', patientReportIdValidator, validate, getPatientReportSummary);
router.get('/invoices', listPatientInvoices);
router.get('/profile', getPatientProfile);
router.put('/profile', updateProfileValidator, validate, updatePatientProfile);

export default router;

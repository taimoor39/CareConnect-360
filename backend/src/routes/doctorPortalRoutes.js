import { Router } from 'express';
import multer from 'multer';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  approveDoctorSummary,
  createConsultation,
  createPrescription,
  getDoctorConsultations,
  getDoctorDashboardStats,
  getDoctorPatientDetail,
  getDoctorPatients,
  getDoctorProfile,
  getDoctorReports,
  getDoctorSchedule,
  rejectDoctorSummary,
  summarizeDoctorReport,
  updateConsultation,
  updateDoctorProfile,
  uploadDoctorReport,
} from '../controllers/doctorPortalController.js';
import {
  consultationValidator,
  objectIdParamValidator,
  prescriptionValidator,
  reportValidator,
  scheduleQueryValidator,
  updateConsultationValidator,
} from '../validators/consultationValidators.js';
import { updateDoctorProfileValidator } from '../validators/doctorValidators.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);
router.use(authorizeRoles('doctor'));

router.get('/profile', getDoctorProfile);
router.put('/profile', updateDoctorProfileValidator, validate, updateDoctorProfile);

router.get('/dashboard-stats', getDoctorDashboardStats);
router.get('/schedule', scheduleQueryValidator, validate, getDoctorSchedule);
router.get('/patients', getDoctorPatients);
router.get('/patients/:patientId', objectIdParamValidator, validate, getDoctorPatientDetail);

router.get('/consultations', getDoctorConsultations);
router.post('/consultations', consultationValidator, validate, createConsultation);
router.put('/consultations/:id', updateConsultationValidator, validate, updateConsultation);

router.post('/prescriptions', prescriptionValidator, validate, createPrescription);

router.get('/reports', getDoctorReports);
router.post('/reports', upload.single('file'), reportValidator, validate, uploadDoctorReport);
router.post('/reports/:id/summarize', objectIdParamValidator, validate, summarizeDoctorReport);
router.put('/reports/:id/approve-summary', objectIdParamValidator, validate, approveDoctorSummary);
router.put('/reports/:id/reject-summary', objectIdParamValidator, validate, rejectDoctorSummary);

export default router;


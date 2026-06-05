import { Router } from 'express';
import multer from 'multer';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { parseConsultationPutBody } from '../middleware/parseConsultationBody.js';
import {
  approveConsultationSummary,
  createConsultation,
  getAppointmentConsultationBundle,
  getDoctorConsultations,
  getDoctorDashboardStats,
  getDoctorPatientDetail,
  getDoctorPatients,
  getDoctorPrescriptions,
  getDoctorProfile,
  getDoctorReports,
  getDoctorSchedule,
  rejectConsultationSummary,
  regenerateConsultationSummary,
  replaceConsultationReport,
  deleteConsultationReport,
  saveConsultationPrescription,
  summarizeConsultationReport,
  updateConsultation,
  updateDoctorProfile,
  upsertConsultationByAppointment,
  uploadConsultationMedicalReport,
  uploadDoctorReport,
} from '../controllers/doctorPortalController.js';
import {
  appointmentIdParamValidator,
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

router.get('/appointments/:appointmentId/consultation', appointmentIdParamValidator, validate, getAppointmentConsultationBundle);
router.put(
  '/appointments/:appointmentId/consultation',
  appointmentIdParamValidator,
  upload.single('reportFile'),
  parseConsultationPutBody,
  updateConsultationValidator,
  validate,
  upsertConsultationByAppointment,
);
router.post(
  '/appointments/:appointmentId/consultation/medical-report',
  appointmentIdParamValidator,
  upload.single('file'),
  reportValidator,
  validate,
  uploadConsultationMedicalReport,
);

router.get('/consultations', getDoctorConsultations);
router.post('/consultations', consultationValidator, validate, createConsultation);
router.put('/consultations/:id', updateConsultationValidator, validate, updateConsultation);

router.post('/consultations/:id/medical-report/summarize', objectIdParamValidator, validate, summarizeConsultationReport);
router.post('/consultations/:id/medical-report/regenerate-summary', objectIdParamValidator, validate, regenerateConsultationSummary);
router.put('/consultations/:id/medical-report/approve-summary', objectIdParamValidator, validate, approveConsultationSummary);
router.put('/consultations/:id/medical-report/reject-summary', objectIdParamValidator, validate, rejectConsultationSummary);

router.get('/prescriptions', getDoctorPrescriptions);
router.post('/prescriptions', prescriptionValidator, validate, saveConsultationPrescription);

router.get('/reports', getDoctorReports);
router.post('/reports', upload.single('file'), reportValidator, validate, uploadDoctorReport);
router.put('/reports/:id/replace', objectIdParamValidator, validate, upload.single('reportFile'), replaceConsultationReport);
router.delete('/reports/:id', objectIdParamValidator, validate, deleteConsultationReport);

router.post('/reports/:id/summarize', objectIdParamValidator, validate, summarizeConsultationReport);
router.post('/reports/:id/regenerate-summary', objectIdParamValidator, validate, regenerateConsultationSummary);
router.put('/reports/:id/approve-summary', objectIdParamValidator, validate, approveConsultationSummary);
router.put('/reports/:id/reject-summary', objectIdParamValidator, validate, rejectConsultationSummary);

export default router;

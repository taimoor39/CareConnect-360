import { Router } from 'express';

import {
  checkInAppointment,
  createAppointment,
  getAppointmentById,
  getAppointmentStats,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  listAppointments,
  updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkInValidator, createAppointmentValidator, updateStatusValidator } from '../validators/appointmentValidators.js';

const router = Router();

router.use(protect);

router.get('/', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), listAppointments);
router.get('/stats', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentStats);
router.get('/patient/:patientId', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentsByPatient);
router.get('/doctor/:doctorId', authorizeRoles('admin', 'receptionist', 'doctor'), getAppointmentsByDoctor);
router.put('/checkin', authorizeRoles('admin', 'receptionist'), checkInValidator, validate, checkInAppointment);
router.get('/:id', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentById);
router.post('/', authorizeRoles('admin', 'receptionist'), createAppointmentValidator, validate, createAppointment);
router.put('/:id/status', authorizeRoles('admin', 'receptionist', 'doctor'), updateStatusValidator, validate, updateAppointmentStatus);

export default router;

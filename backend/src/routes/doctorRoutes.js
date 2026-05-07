import { Router } from 'express';
import { param } from 'express-validator';

import {
  createDoctor,
  getDoctorAvailability,
  getDoctorById,
  getDoctorStatsSummary,
  listDoctors,
  toggleDoctorStatus,
  updateDoctor,
  updateDoctorSchedule,
} from '../controllers/doctorController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDoctorValidator, scheduleValidator, updateDoctorValidator } from '../validators/doctorValidators.js';

const router = Router();
const idCheck = [param('id').isMongoId().withMessage('Invalid doctor ID')];

router.use(protect);

router.get('/stats/summary', authorizeRoles('admin'), getDoctorStatsSummary);
router.get('/', authorizeRoles('admin', 'receptionist'), listDoctors);
router.post('/', authorizeRoles('admin'), createDoctorValidator, validate, createDoctor);
router.put('/:id/schedule', authorizeRoles('admin'), scheduleValidator, validate, updateDoctorSchedule);
router.get('/:id/availability', authorizeRoles('admin', 'receptionist'), idCheck, validate, getDoctorAvailability);
router.get('/:id', authorizeRoles('admin'), idCheck, validate, getDoctorById);
router.put('/:id', authorizeRoles('admin'), updateDoctorValidator, validate, updateDoctor);
router.put('/:id/status', authorizeRoles('admin'), idCheck, validate, toggleDoctorStatus);

export default router;

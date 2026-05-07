import { Router } from 'express';

import {
  archivePatient,
  createPatient,
  getPatientById,
  getPatientStats,
  listPatients,
  searchPatients,
  updatePatient,
} from '../controllers/patientController.js';
import { authorizeRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPatientValidator, patientIdValidator, updatePatientValidator } from '../validators/patientValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', authorizeRoles('admin', 'doctor', 'receptionist'), getPatientStats);
router.get('/search', authorizeRoles('admin', 'doctor', 'receptionist'), searchPatients);
router.post('/', authorizeRoles('admin', 'receptionist'), createPatientValidator, validate, createPatient);
router.get('/', authorizeRoles('admin', 'doctor', 'receptionist'), listPatients);
router.get('/:id', authorizeRoles('admin', 'doctor', 'receptionist'), patientIdValidator, validate, getPatientById);
router.put('/:id', authorizeRoles('admin', 'receptionist'), updatePatientValidator, validate, updatePatient);
router.put('/:id/archive', authorizeRoles('admin'), patientIdValidator, validate, archivePatient);
router.delete('/:id', authorizeRoles('admin'), patientIdValidator, validate, archivePatient);

export default router;

import { Router } from 'express';

import { migrateDoctorUsers, migratePatientUsers } from '../controllers/adminController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.post('/migrate/link-patient-users', migratePatientUsers);
router.post('/migrate/link-doctor-users', migrateDoctorUsers);

export default router;

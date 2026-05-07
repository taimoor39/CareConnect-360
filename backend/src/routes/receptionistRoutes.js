import { Router } from 'express';

import { getDashboardStats } from '../controllers/receptionistController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('receptionist', 'admin'));

router.get('/dashboard-stats', getDashboardStats);

export default router;

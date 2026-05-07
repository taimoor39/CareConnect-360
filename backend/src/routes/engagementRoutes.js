import { Router } from 'express';

import {
  getEngagementLogs,
  getEngagementStats,
  sendEngagementTestEmail,
} from '../controllers/engagementController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorizeRoles('admin'));

router.get('/logs', getEngagementLogs);
router.get('/stats', getEngagementStats);
router.post('/test/:ruleId', sendEngagementTestEmail);

export default router;

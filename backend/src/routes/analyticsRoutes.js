import { Router } from 'express';
import {
  getAnalyticsAppointments,
  getAnalyticsDoctors,
  getAnalyticsOverview,
  getAnalyticsPatients,
  getAnalyticsRevenue,
  getAnalyticsSummary,
} from '../controllers/analyticsController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/summary', getAnalyticsSummary);
router.get('/overview', getAnalyticsOverview);
router.get('/patients', getAnalyticsPatients);
router.get('/appointments', getAnalyticsAppointments);
router.get('/revenue', getAnalyticsRevenue);
router.get('/doctors', getAnalyticsDoctors);

export default router;

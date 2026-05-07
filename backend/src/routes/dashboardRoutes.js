import { Router } from 'express';

import {
  getAppointmentStats,
  getKpiStats,
  getPendingActions,
  getRecentActivity,
  getRecentPatients,
  getRevenueChart,
  getSystemHealth,
  getTodaysSchedule,
} from '../controllers/dashboardController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/kpi-stats', getKpiStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/appointment-stats', getAppointmentStats);
router.get('/todays-schedule', getTodaysSchedule);
router.get('/recent-patients', getRecentPatients);
router.get('/system-health', getSystemHealth);
router.get('/recent-activity', getRecentActivity);
router.get('/pending-actions', getPendingActions);

export default router;

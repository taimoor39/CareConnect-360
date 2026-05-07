import { Router } from 'express';

import {
  exportAuditLogs,
  getAuditActions,
  getAuditLogById,
  getAuditLogs,
  getAuditStats,
  getAuditUsers,
} from '../controllers/auditController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAuditLogByIdValidator, getAuditLogsValidator } from '../validators/auditValidators.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', getAuditLogsValidator, validate, getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/export', getAuditLogsValidator, validate, exportAuditLogs);
router.get('/actions', getAuditActions);
router.get('/users', getAuditUsers);
router.get('/:id', getAuditLogByIdValidator, validate, getAuditLogById);

export default router;

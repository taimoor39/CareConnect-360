import { Router } from 'express';
import { param } from 'express-validator';

import { getStaffStats, listStaff, toggleStaffStatus, updateStaff } from '../controllers/staffController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateStaffValidator } from '../validators/staffValidators.js';

const router = Router();
const idCheck = [param('id').isMongoId().withMessage('Invalid staff ID')];

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', listStaff);
router.get('/stats', getStaffStats);
router.put('/:id', updateStaffValidator, validate, updateStaff);
router.put('/:id/status', idCheck, validate, toggleStaffStatus);

export default router;

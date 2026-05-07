import { Router } from 'express';

import {
  changeUserRole,
  createUser,
  getUserById,
  listUsers,
  sendResetEmailToUser,
  setTemporaryPassword,
  softDeleteUser,
  toggleUserStatus,
  updateUser,
} from '../controllers/userController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  changeRoleValidator,
  createUserValidator,
  listUsersQueryValidator,
  setTempPasswordValidator,
  toggleStatusValidator,
  updateUserValidator,
  userIdValidator,
} from '../validators/userValidators.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', listUsersQueryValidator, validate, listUsers);
router.post('/', createUserValidator, validate, createUser);
router.post('/:id/send-reset-email', userIdValidator, validate, sendResetEmailToUser);
router.put('/:id/set-temp-password', setTempPasswordValidator, validate, setTemporaryPassword);
router.get('/:id', userIdValidator, validate, getUserById);
router.put('/:id', updateUserValidator, validate, updateUser);
router.put('/:id/status', toggleStatusValidator, validate, toggleUserStatus);
router.put('/:id/role', changeRoleValidator, validate, changeUserRole);
router.delete('/:id', userIdValidator, validate, softDeleteUser);

export default router;

import { Router } from 'express';

import {
  changeRequiredPassword,
  forgotPassword,
  login,
  me,
  resetPassword,
  verifyResetToken,
} from '../controllers/authController.js';
import { protect, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import {
  changeRequiredPasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyResetTokenValidator,
} from '../validators/authValidators.js';

const router = Router();

router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);

router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.get('/verify-reset-token/:token', verifyResetTokenValidator, validate, verifyResetToken);
router.post(
  '/reset-password/:token',
  authLimiter,
  resetPasswordValidator,
  validate,
  resetPassword,
);
router.post(
  '/change-required-password',
  protect,
  changeRequiredPasswordValidator,
  validate,
  changeRequiredPassword,
);

export default router;

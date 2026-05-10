import { Router } from 'express';

import {
  changeRequiredPassword,
  forgotPassword,
  login,
  me,
  registerPatient,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
  verifyResetToken,
} from '../controllers/authController.js';
import { protect, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import {
  changeRequiredPasswordValidator,
  forgotPasswordValidator,
  registerPatientValidator,
  resetPasswordValidator,
  verifyEmailTokenValidator,
  verifyResetTokenValidator,
} from '../validators/authValidators.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, registerPatientValidator, validate, registerPatient);
router.get('/verify-email/:token', verifyEmailTokenValidator, validate, verifyEmail);
router.post('/resend-verification', requireAuth, resendVerificationEmail);
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

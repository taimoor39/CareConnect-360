import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import auditLogger from '../utils/auditLogger.js';
import { sendPasswordResetEmail, toEmailErrorMessage } from '../utils/emailService.js';
import { clearResetFieldsByUserId, hashResetToken, issuePlainResetToken } from '../utils/passwordReset.js';
import { signToken } from '../utils/jwt.js';

export const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  requirePasswordChange: !!user.requirePasswordChange,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const forgotPasswordSuccess = (res) =>
  res.json({
    success: true,
    message: 'If this email exists, a reset link has been sent.',
  });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw AppError.badRequest('Email and password are required');

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) throw AppError.unauthorized('Invalid credentials');
  if (!user.isActive) throw AppError.forbidden('Access denied');

  const valid = await user.comparePassword(password);
  if (!valid) throw AppError.unauthorized('Invalid credentials');

  const token = signToken(user, {
    payload: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  res.json({ success: true, token, user: buildUserResponse(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: buildUserResponse(req.user) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    return forgotPasswordSuccess(res);
  }

  let resetToken;
  try {
    resetToken = await issuePlainResetToken(user);
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Could not process request. Please try again later.',
    });
  }

  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user, resetUrl);
  } catch (err) {
    await clearResetFieldsByUserId(user._id);
    console.error('[RESET EMAIL FAILED][FORGOT PASSWORD]:', {
      code: err?.code || null,
      command: err?.command || null,
      message: err?.message || null,
      userId: String(user._id),
      userEmail: user.email,
    });
    return res.status(500).json({
      success: false,
      message: toEmailErrorMessage(err),
    });
  }

  await auditLogger({
    userId: user._id,
    action: 'PASSWORD_RESET_REQUESTED',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { email: user.email },
    req,
  });

  return forgotPasswordSuccess(res);
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  const hashedToken = hashResetToken(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('email');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Reset link is invalid or has expired',
    });
  }

  const masked = String(user.email).replace(/(.{2})(.*)(@.*)/, '$1***$3');

  res.json({
    success: true,
    message: 'Token is valid',
    data: { email: masked },
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = hashResetToken(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Reset link is invalid or has expired. Please request a new one.',
    });
  }

  const { newPassword } = req.body;
  user.password = newPassword;
  user.passwordResetToken = '';
  user.passwordResetExpiry = null;
  user.requirePasswordChange = false;
  await user.save();

  await auditLogger({
    userId: user._id,
    action: 'PASSWORD_RESET_COMPLETED',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { method: 'email_reset' },
    req,
  });

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in.',
  });
});

export const changeRequiredPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw AppError.unauthorized('Invalid user');

  if (!user.requirePasswordChange) {
    return res.status(400).json({
      success: false,
      message: 'No password change required',
    });
  }

  const { newPassword } = req.body;
  user.password = newPassword;
  user.requirePasswordChange = false;
  await user.save();

  await auditLogger({
    userId: user._id,
    action: 'PASSWORD_CHANGE_REQUIRED_COMPLETED',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: {},
    req,
  });

  res.json({ success: true, message: 'Password updated successfully' });
});

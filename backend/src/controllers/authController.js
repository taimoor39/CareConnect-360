/**
 * Authentication & identity endpoints (/api/auth/*).
 *
 * - JWT issued on login; password changes bump User.tokenVersion to invalidate old tokens.
 * - Patient self-register creates User + Patient and queues verification email (SMTP required).
 * - Set ENFORCE_EMAIL_VERIFICATION=true to block non-admin login until email is verified.
 */
import Patient from '../models/Patient.js';
import PortalAccessRequest from '../models/PortalAccessRequest.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import auditLogger from '../utils/auditLogger.js';
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  toEmailErrorMessage,
} from '../utils/emailService.js';
import {
  clearVerificationFieldsByUserId,
  hashVerificationToken,
  issuePlainVerificationToken,
} from '../utils/emailVerification.js';
import { clearResetFieldsByUserId, hashResetToken, issuePlainResetToken } from '../utils/passwordReset.js';
import { signToken } from '../utils/jwt.js';
import { findPatientByUserId } from '../utils/patientLink.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';

const enforceEmailVerification = () =>
  String(process.env.ENFORCE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';

export const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: Boolean(user.isEmailVerified),
  requirePasswordChange: !!user.requirePasswordChange,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

async function queueVerificationEmail(userDoc) {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  try {
    const plain = await issuePlainVerificationToken(userDoc);
    const verifyUrl = `${baseUrl}/verify-email/${plain}`;
    await sendEmailVerificationEmail(userDoc, verifyUrl);
  } catch (err) {
    console.error('[VERIFY EMAIL QUEUE FAILED]:', err?.message || err);
    await clearVerificationFieldsByUserId(userDoc._id).catch(() => {});
  }
}

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

  if (
    enforceEmailVerification()
    && user.role !== 'admin'
    && !user.isEmailVerified
  ) {
    throw AppError.forbidden(
      'Please verify your email before signing in. Check your inbox or request a new verification link.',
    );
  }

  if (user.role === 'patient') {
    const patient = await findPatientByUserId(user._id)
      .select('portalAccessStatus portalAccessRejectionReason')
      .lean();
    if (patient?.portalAccessStatus === 'pending') {
      throw AppError.forbidden(
        'Your portal access is pending administrator approval. You will be able to sign in once the clinic approves your registration.',
      );
    }
    if (patient?.portalAccessStatus === 'rejected') {
      const reason = patient.portalAccessRejectionReason
        ? ` Reason: ${patient.portalAccessRejectionReason}`
        : '';
      throw AppError.forbidden(
        `Portal access was not approved for your account.${reason} Please contact your clinic if you need assistance.`,
      );
    }
  }

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
  user.tokenVersion = Number(user.tokenVersion ?? 0) + 1;
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
  user.tokenVersion = Number(user.tokenVersion ?? 0) + 1;
  await user.save();

  await auditLogger({
    userId: user._id,
    action: 'PASSWORD_CHANGE_REQUIRED_COMPLETED',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: {},
    req,
  });

  const fresh = await User.findById(user._id).lean();
  const token = signToken(fresh, {
    payload: {
      id: fresh._id.toString(),
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
    },
  });

  res.json({
    success: true,
    message: 'Password updated successfully',
    token,
    user: buildUserResponse(fresh),
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = hashVerificationToken(req.params.token);
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpiry: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Verification link is invalid or has expired. Request a new one after signing in.',
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = '';
  user.emailVerificationExpiry = null;
  await user.save();

  await auditLogger({
    userId: user._id,
    action: 'EMAIL_VERIFIED',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { email: user.email },
    req,
  });

  res.json({ success: true, message: 'Email verified successfully. You can close this page.' });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpiry');
  if (!user) throw AppError.unauthorized('Invalid user');
  if (user.isEmailVerified) {
    return res.status(400).json({ success: false, message: 'Email is already verified' });
  }

  await queueVerificationEmail(user);

  res.json({
    success: true,
    message: 'If SMTP is configured, a verification email has been sent.',
  });
});

const normalizeGender = (v) => {
  const g = String(v || '').toLowerCase();
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  return 'Other';
};

export const registerPatient = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const firstName = String(req.body.firstName || '').trim();
  const lastName = String(req.body.lastName || '').trim();
  const phone = String(req.body.phone || '').trim();

  if (!email || !password || !firstName || !lastName || !phone) {
    throw AppError.badRequest('firstName, lastName, email, password, and phone are required');
  }

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw AppError.conflict('An account already exists with this email');

  const dobRaw = req.body.dateOfBirth;
  const dateOfBirth = dobRaw ? new Date(dobRaw) : null;
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) {
    throw AppError.badRequest('Valid dateOfBirth is required');
  }

  const user = await User.create({
    name: `${firstName} ${lastName}`.trim(),
    email,
    password,
    phone,
    role: 'patient',
    isActive: true,
    isEmailVerified: false,
    requirePasswordChange: false,
  });

  const count = await Patient.countDocuments();
  const year = new Date().getFullYear();
  const patientIdStr = `PAT-${year}-${String(count + 1).padStart(4, '0')}`;

  const patient = await Patient.create({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    dateOfBirth,
    gender: normalizeGender(req.body.gender),
    phone,
    email,
    contact: { phone, email },
    patientId: patientIdStr,
    patientCode: patientIdStr,
    user: user._id,
    userId: user._id,
    portalAccessRequested: true,
    portalAccessEmail: email,
    portalAccessRequestedAt: new Date(),
    portalAccessRequestedBy: user._id,
    portalAccessStatus: 'pending',
    portalAccessRejectionReason: null,
  });

  await PortalAccessRequest.create({
    patientId: patient._id,
    requestedEmail: email,
    requestedBy: user._id,
    status: 'pending',
    createdUserId: user._id,
  });

  await auditLogger({
    userId: user._id,
    action: 'SELF_REGISTERED_PATIENT',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { email, portalAccessPending: true, patientId: String(patient._id) },
    req,
  });

  notifyAdmins({ scopes: ['dashboard', 'portalBadge'], reason: 'portal_access_requested' });

  queueVerificationEmail(user).catch(() => {});

  const fresh = await User.findById(user._id).lean();

  res.status(201).json({
    success: true,
    message:
      'Account created. Your portal access must be approved by the clinic before you can sign in. You will use this email and password after approval. Check your email if verification is required.',
    user: buildUserResponse(fresh),
  });
});

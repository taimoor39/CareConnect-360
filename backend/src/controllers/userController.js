import DoctorProfile from '../models/DoctorProfile.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import auditLogger from '../utils/auditLogger.js';
import { sendPasswordResetEmail, toEmailErrorMessage } from '../utils/emailService.js';
import { clearResetFieldsByUserId, issuePlainResetToken } from '../utils/passwordReset.js';
import { buildFullName, paginationMeta, parsePagination, searchRegex } from '../utils/query.js';

// ─── Private helpers ──────────────────────────────────────────────────────

const findUserOrFail = async (id, select = '-password') => {
  const user = await User.findById(id).select(select);
  if (!user) throw AppError.notFound('User not found');
  return user;
};

const guardSelfAction = (req, verb) => {
  if (req.user._id.toString() === req.params.id) {
    throw AppError.badRequest(`Admin cannot ${verb} themselves`);
  }
};

const ensureUniqueEmail = async (email, excludeId = null) => {
  const query = { email };
  if (excludeId) query._id = { $ne: excludeId };
  const dup = await User.findOne(query).lean();
  if (dup) throw AppError.conflict('This email is already registered');
};

const linkPatientRole = async (user, body) => {
  const email = user.email;
  const existing = body.linkPatientId
    ? await Patient.findById(body.linkPatientId)
    : await Patient.findOne({ email });

  if (existing) {
    existing.userId = user._id;
    await existing.save();
    return;
  }

  const count = await Patient.countDocuments();
  const year = new Date().getFullYear();
  const patientId = `PAT-${year}-${String(count + 1).padStart(4, '0')}`;
  const fullName = buildFullName(body);
  const parts = fullName.split(' ');

  await Patient.create({
    patientId,
    name: fullName,
    firstName: parts[0] || 'Patient',
    lastName: parts.slice(1).join(' ') || 'User',
    dateOfBirth: new Date('1990-01-01'),
    email,
    phone: user.phone,
    status: 'Active',
    isArchived: false,
    userId: user._id,
    registeredBy: null,
  });
};

const linkDoctorRole = async (userId) => {
  const DoctorProfile = (await import('../models/DoctorProfile.js')).default;
  await DoctorProfile.create({
    userId,
    specialization: '',
    qualification: '',
    schedule: { days: [], shiftStart: '', shiftEnd: '', maxPatientsPerDay: 20, consultationDurationMins: 30 },
    isProfileComplete: false,
    isActive: true,
  });
};

const safeUser = (id) => User.findById(id).select('-password').lean();

const syncPatientRecord = async (user) => {
  const parts = user.name.split(' ');
  await Patient.findOneAndUpdate(
    { userId: user._id },
    { name: user.name, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', email: user.email, phone: user.phone },
  );
};

// ─── Route handlers ───────────────────────────────────────────────────────

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const nameRegex = searchRegex(req.query.name);
  const filter = {};
  if (nameRegex) {
    filter.name = nameRegex;
  }

  const [users, total, totalUsers, activeUsers] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password').lean(),
    User.countDocuments(filter),
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      stats: { totalUsers, activeUsers, roles: 4 },
      pagination: paginationMeta(total, page, limit),
    },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  await ensureUniqueEmail(email);

  const isDoctorRole = req.body.role === 'doctor';
  const user = await User.create({
    name: buildFullName(req.body),
    email,
    password: req.body.password,
    phone: req.body.phone,
    role: req.body.role,
    specialization: isDoctorRole ? String(req.body.specialization || '').trim() : '',
    qualification: isDoctorRole ? String(req.body.qualification || '').trim() : '',
    isActive: true,
  });

  await auditFromReq(req, 'USER_CREATED', `User:${user._id}`);

  if (user.role === 'patient') await linkPatientRole(user, req.body);
  if (user.role === 'doctor') await linkDoctorRole(user._id);

  const created = await safeUser(user._id);
  res.status(201).json({ success: true, data: { user: created } });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').lean();
  if (!user) throw AppError.notFound('User not found');

  res.json({ success: true, data: { user } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await findUserOrFail(req.params.id, '+password');
  const fromRole = user.role;
  const fromIsActive = user.isActive;

  if (req.body.email) {
    const normalized = String(req.body.email).toLowerCase().trim();
    await ensureUniqueEmail(normalized, user._id);
    user.email = normalized;
  }

  if (req.body.name || req.body.firstName || req.body.lastName) user.name = buildFullName(req.body);
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.role) user.role = req.body.role;
  if (req.body.password) user.password = req.body.password;

  const effectiveRole = req.body.role || user.role;
  if (typeof req.body.specialization !== 'undefined') {
    user.specialization = effectiveRole === 'doctor' ? String(req.body.specialization || '').trim() : '';
  }
  if (typeof req.body.qualification !== 'undefined') {
    user.qualification = effectiveRole === 'doctor' ? String(req.body.qualification || '').trim() : '';
  }

  await user.save();

  if (user.role === 'patient' || req.body.role === 'patient') {
    await syncPatientRecord(user);
  }

  await auditFromReq(req, 'USER_UPDATED', `User:${user._id}`, {
    fromRole,
    toRole: user.role,
    fromIsActive,
    toIsActive: user.isActive,
  });

  const safe = user.toObject({ versionKey: false });
  delete safe.password;
  res.json({ success: true, data: { user: safe } });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  guardSelfAction(req, 'deactivate');
  const user = await findUserOrFail(req.params.id);
  const fromIsActive = user.isActive;

  user.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
  await user.save();

  if (user.role === 'patient') {
    await Patient.findOneAndUpdate({ userId: user._id }, { status: user.isActive ? 'Active' : 'Inactive' });
  }

  if (user.role === 'doctor') {
    await DoctorProfile.findOneAndUpdate({ userId: user._id }, { $set: { isActive: user.isActive } });
  }

  await auditFromReq(req, user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', `User:${user._id}`, {
    fromIsActive,
    toIsActive: user.isActive,
    role: user.role,
  });

  notifyAdmins({ scopes: ['dashboard'], reason: 'user_status_toggle' });

  const safe = await safeUser(user._id);
  res.json({ success: true, data: { user: safe } });
});

export const changeUserRole = asyncHandler(async (req, res) => {
  guardSelfAction(req, 'change their own role');
  const user = await findUserOrFail(req.params.id);

  const fromRole = user.role;
  user.role = req.body.role;
  if (user.role !== 'doctor') {
    user.specialization = '';
    user.qualification = '';
  }
  await user.save();

  await auditFromReq(req, 'ROLE_CHANGED', `User:${user._id}`, { from: fromRole, to: user.role });

  const safe = await safeUser(user._id);
  res.json({ success: true, data: { user: safe } });
});

export const softDeleteUser = asyncHandler(async (req, res) => {
  guardSelfAction(req, 'delete');
  const user = await findUserOrFail(req.params.id);

  user.isActive = false;
  await user.save();

  if (user.role === 'patient') {
    await Patient.findOneAndUpdate({ userId: user._id }, { status: 'Inactive' });
  }

  if (user.role === 'doctor') {
    await DoctorProfile.findOneAndUpdate({ userId: user._id }, { $set: { isActive: false } });
  }

  await auditFromReq(req, 'USER_SOFT_DELETED', `User:${user._id}`, {
    role: user.role,
  });

  notifyAdmins({ scopes: ['dashboard'], reason: 'user_soft_deleted' });

  res.json({ success: true, data: { message: 'User deactivated successfully' } });
});

export const sendResetEmailToUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');
  if (!user.isActive) throw AppError.badRequest('User account is inactive');

  let resetToken;
  try {
    resetToken = await issuePlainResetToken(user);
  } catch {
    throw AppError.internal('Could not issue reset token');
  }

  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user, resetUrl);
  } catch (err) {
    await clearResetFieldsByUserId(user._id);
    console.error('[RESET EMAIL FAILED][ADMIN]:', {
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
    userId: req.user._id,
    action: 'ADMIN_TRIGGERED_PASSWORD_RESET',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { targetUserEmail: user.email },
    req,
  });

  res.json({ success: true, message: 'Reset email sent', data: { email: user.email } });
});

export const setTemporaryPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw AppError.notFound('User not found');

  user.password = req.body.temporaryPassword;
  user.requirePasswordChange = true;
  user.passwordResetToken = '';
  user.passwordResetExpiry = null;
  await user.save();

  await auditLogger({
    userId: req.user._id,
    action: 'ADMIN_SET_TEMP_PASSWORD',
    target: `User:${user._id}`,
    targetCollection: 'users',
    details: { targetUserId: String(user._id) },
    req,
  });

  res.json({
    success: true,
    message: 'Temporary password set. User must change it on next login.',
  });
});

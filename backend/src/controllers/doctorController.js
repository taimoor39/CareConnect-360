import mongoose from 'mongoose';

import DoctorProfile from '../models/DoctorProfile.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { dayBoundsInPakistan, isISODateOnly, toPakistanISODate } from '../utils/dateTime.js';
import { paginationMeta, parseName, parsePagination, searchRegex } from '../utils/query.js';

// ─── Constants ────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const summaryCache = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

// ─── Low-level helpers ────────────────────────────────────────────────────

const toObjectId = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

const invalidateCache = () => { summaryCache.data = null; summaryCache.ts = 0; };

const to12Hour = (v) => {
  if (!v || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return v || '--';
  const [h, m] = v.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

const parseDateInput = (raw) => {
  const s = String(raw || '').trim();
  if (!isISODateOnly(s)) return null;
  return dayBoundsInPakistan(s)?.start || null;
};

const collectionCount = async (name, query) => {
  try { return await mongoose.connection.collection(name).countDocuments(query); }
  catch { return 0; }
};

// ─── View / merge helpers ─────────────────────────────────────────────────

const mergeDoctorRecord = (user, profile, stats = null) => {
  const { firstName, lastName } = parseName(user.name);
  return {
    _id: user._id,
    code: String(user._id).slice(0, 8).toUpperCase(),
    firstName,
    lastName,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    specialization: profile?.specialization || user.specialization || '',
    qualification: profile?.qualification || user.qualification || '',
    profile: profile
      ? {
          _id: profile._id,
          userId: profile.userId,
          specialization: profile.specialization,
          qualification: profile.qualification,
          schedule: profile.schedule,
          bio: profile.bio,
          isActive: profile.isActive,
          isProfileComplete: profile.isProfileComplete || false,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      : null,
    stats,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// ─── Email ────────────────────────────────────────────────────────────────

const sendWelcomeEmailAsync = (user) => {
  setImmediate(async () => {
    try {
      const host = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!host || !smtpUser || !pass) return;

      const { default: nodemailer } = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: smtpUser, pass },
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: user.email,
        subject: 'Welcome to CareConnect 360',
        text: `Hello ${user.name}, your doctor account is now active on CareConnect 360.`,
      });
    } catch (err) {
      console.error('Welcome email failed:', err.message);
    }
  });
};

// ─── Profile payload / completeness ───────────────────────────────────────

const buildProfilePayload = (body) => ({
  specialization: String(body.specialization || '').trim(),
  qualification: String(body.qualification || '').trim(),
  schedule: {
    days: Array.isArray(body.schedule?.days) ? body.schedule.days : [],
    shiftStart: String(body.schedule?.shiftStart || ''),
    shiftEnd: String(body.schedule?.shiftEnd || ''),
    maxPatientsPerDay: Number(body.schedule?.maxPatientsPerDay || 20),
    consultationDurationMins: Number(body.schedule?.consultationDurationMins || 30),
  },
  bio: String(body.bio || '').trim(),
});

const isProfileComplete = (p) => Boolean(
  p.specialization && p.qualification &&
  p.schedule?.days?.length > 0 &&
  p.schedule?.shiftStart && p.schedule?.shiftEnd,
);

const ensureProfileExists = async (userId, user) => {
  const existing = await DoctorProfile.findOne({ userId });
  if (existing) return existing;

  return DoctorProfile.create({
    userId,
    specialization: String(user.specialization || '').trim(),
    qualification: String(user.qualification || '').trim(),
    schedule: { days: [], shiftStart: '', shiftEnd: '', maxPatientsPerDay: 20, consultationDurationMins: 30 },
    bio: '',
    isActive: typeof user.isActive === 'boolean' ? user.isActive : true,
    isProfileComplete: false,
  });
};

const applyUserFields = (user, body) => {
  const { firstName: curFirst, lastName: curLast } = parseName(user.name);
  const first = typeof body.firstName === 'string' ? body.firstName.trim() : curFirst;
  const last = typeof body.lastName === 'string' ? body.lastName.trim() : curLast;

  user.name = `${first} ${last}`.trim();
  if (typeof body.phone === 'string') user.phone = body.phone;
  if (body.email) { user.email = body.email; user.isEmailVerified = false; }
  if (typeof body.password === 'string' && body.password.trim()) user.password = body.password;
  if (typeof body.specialization !== 'undefined') user.specialization = String(body.specialization || '').trim();
  if (typeof body.qualification !== 'undefined') user.qualification = String(body.qualification || '').trim();
  if (typeof body.isActive === 'boolean') user.isActive = body.isActive;
};

const applyProfileFields = (profile, body) => {
  if (typeof body.specialization !== 'undefined') profile.specialization = String(body.specialization || '').trim();
  if (typeof body.qualification !== 'undefined') profile.qualification = String(body.qualification || '').trim();

  if (body.schedule && typeof body.schedule === 'object') {
    if (Array.isArray(body.schedule.days)) profile.schedule.days = body.schedule.days;
    if (typeof body.schedule.shiftStart === 'string') profile.schedule.shiftStart = body.schedule.shiftStart;
    if (typeof body.schedule.shiftEnd === 'string') profile.schedule.shiftEnd = body.schedule.shiftEnd;
    if (typeof body.schedule.maxPatientsPerDay !== 'undefined') profile.schedule.maxPatientsPerDay = Number(body.schedule.maxPatientsPerDay);
    if (typeof body.schedule.consultationDurationMins !== 'undefined') profile.schedule.consultationDurationMins = Number(body.schedule.consultationDurationMins);
  }

  if (typeof body.bio !== 'undefined') profile.bio = String(body.bio || '').trim();
  if (typeof body.isActive === 'boolean') profile.isActive = body.isActive;

  profile.isProfileComplete = isProfileComplete(profile);
};

// ─── Finders ──────────────────────────────────────────────────────────────

const findDoctorUser = async (id, select = '-password') => {
  const user = await User.findOne({ _id: id, role: 'doctor' }).select(select);
  if (!user) throw AppError.notFound('Doctor not found');
  return user;
};

// ─── Route handlers ───────────────────────────────────────────────────────

export const createDoctor = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  const normalizedEmail = String(email || '').toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) throw AppError.conflict('A user already exists with this email');

  const newUser = await User.create({
    name: `${String(firstName).trim()} ${String(lastName).trim()}`,
    email: normalizedEmail,
    phone,
    password,
    role: 'doctor',
    specialization: String(req.body.specialization || '').trim(),
    qualification: String(req.body.qualification || '').trim(),
    isActive: true,
  });

  let profile;
  try {
    profile = await DoctorProfile.create({ userId: newUser._id, ...buildProfilePayload(req.body), isActive: true });
  } catch (err) {
    await User.findByIdAndDelete(newUser._id);
    throw err;
  }

  await auditFromReq(req, 'DOCTOR_CREATED', `User:${newUser._id}`);
  invalidateCache();
  sendWelcomeEmailAsync(newUser);

  const safeUser = await User.findById(newUser._id).select('-password').lean();
  res.status(201).json({ success: true, data: { user: safeUser, profile } });
});

export const listDoctors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = String(req.query.status || '').trim().toLowerCase();
  const specialization = String(req.query.specialization || '').trim();

  const userQuery = { role: 'doctor' };
  if (status === 'active') userQuery.isActive = true;
  if (status === 'inactive') userQuery.isActive = false;

  const regex = searchRegex(req.query.search);
  if (regex) userQuery.$or = [{ name: regex }, { email: regex }, { phone: regex }];

  const profileFilter = {};
  if (specialization) profileFilter.specialization = new RegExp(`^${specialization}$`, 'i');

  const [users, total] = await Promise.all([
    User.find(userQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password').lean(),
    User.countDocuments(userQuery),
  ]);

  const ids = users.map((u) => u._id);
  const profiles = await DoctorProfile.find({ userId: { $in: ids }, ...profileFilter }).lean();
  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  const rows = users
    .map((u) => mergeDoctorRecord(u, profileMap.get(String(u._id))))
    .filter((r) => r.profile || !specialization);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(total, page, limit),
  });
});

export const getDoctorById = asyncHandler(async (req, res) => {
  const user = await findDoctorUser(req.params.id);
  const profile = await DoctorProfile.findOne({ userId: user._id }).lean();
  const id = toObjectId(req.params.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [totalConsultationsThisMonth, upcomingAppointments, totalAppointments, completedAppointments] = await Promise.all([
    collectionCount('consultations', { doctorId: id, date: { $gte: monthStart, $lt: monthEnd } }),
    collectionCount('appointments', { doctorId: id, date: { $gte: now }, status: 'Scheduled' }),
    collectionCount('appointments', { doctorId: id }),
    collectionCount('appointments', { doctorId: id, status: 'Completed' }),
  ]);

  const completionRate = totalAppointments === 0 ? 0 : Math.round((completedAppointments / totalAppointments) * 100);
  const data = mergeDoctorRecord(user, profile, { totalConsultationsThisMonth, upcomingAppointments, completionRate });

  res.json({ success: true, data });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const user = await findDoctorUser(req.params.id, '+password');
  const profile = await ensureProfileExists(req.params.id, user);

  // Guard: email uniqueness
  const incomingEmail = req.body.email ? String(req.body.email).toLowerCase().trim() : null;
  if (incomingEmail && incomingEmail !== user.email) {
    const dup = await User.findOne({ email: incomingEmail, _id: { $ne: user._id } }).lean();
    if (dup) throw AppError.conflict('A user already exists with this email');
    req.body.email = incomingEmail;
  } else {
    delete req.body.email;
  }

  applyUserFields(user, req.body);
  await user.save();

  applyProfileFields(profile, req.body);
  await profile.save();

  await auditFromReq(req, 'DOCTOR_UPDATED', `User:${user._id}`);
  invalidateCache();

  const [safeUser, safeProfile] = await Promise.all([
    User.findById(user._id).select('-password').lean(),
    DoctorProfile.findOne({ userId: user._id }).lean(),
  ]);

  res.json({ success: true, data: mergeDoctorRecord(safeUser, safeProfile) });
});

export const toggleDoctorStatus = asyncHandler(async (req, res) => {
  const user = await findDoctorUser(req.params.id);
  const profile = await DoctorProfile.findOne({ userId: req.params.id });
  if (!profile) throw AppError.notFound('Doctor not found');

  if (req.user._id.toString() === user._id.toString()) {
    throw AppError.badRequest('You cannot deactivate your own account');
  }

  const nextStatus = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
  user.isActive = nextStatus;
  profile.isActive = nextStatus;
  await Promise.all([user.save(), profile.save()]);

  await auditFromReq(req, nextStatus ? 'DOCTOR_ACTIVATED' : 'DOCTOR_DEACTIVATED', `User:${user._id}`);
  invalidateCache();

  res.json({
    success: true,
    message: nextStatus ? 'Doctor activated successfully' : 'Doctor deactivated successfully',
    data: { isActive: nextStatus },
  });
});

export const updateDoctorSchedule = asyncHandler(async (req, res) => {
  const user = await findDoctorUser(req.params.id);
  const { days, shiftStart, shiftEnd, maxPatientsPerDay, consultationDurationMins } = req.body;

  if (shiftEnd <= shiftStart) {
    throw AppError.unprocessable('Shift end must be after shift start', [
      { field: 'shiftEnd', message: 'Shift end must be after shift start' },
    ]);
  }

  const profile = await DoctorProfile.findOne({ userId: user._id });
  if (!profile) throw AppError.notFound('Doctor profile not found');

  profile.schedule.days = days;
  profile.schedule.shiftStart = shiftStart;
  profile.schedule.shiftEnd = shiftEnd;
  if (typeof maxPatientsPerDay !== 'undefined') profile.schedule.maxPatientsPerDay = Number(maxPatientsPerDay);
  if (typeof consultationDurationMins !== 'undefined') profile.schedule.consultationDurationMins = Number(consultationDurationMins);
  profile.isProfileComplete = isProfileComplete(profile);
  await profile.save();

  await auditFromReq(req, 'SCHEDULE_UPDATED', `User:${user._id}`, {
    days,
    shiftStart,
    shiftEnd,
    maxPatientsPerDay: profile.schedule.maxPatientsPerDay,
    consultationDurationMins: profile.schedule.consultationDurationMins,
  });

  res.json({ success: true, message: 'Doctor schedule updated successfully', data: profile.schedule });
});

export const getDoctorStatsSummary = asyncHandler(async (_req, res) => {
  const now = Date.now();
  if (summaryCache.data && now - summaryCache.ts < CACHE_TTL) {
    return res.json({ success: true, data: summaryCache.data });
  }

  const [userCounts, specializationRows, profileStats] = await Promise.all([
    User.aggregate([
      { $match: { role: 'doctor' } },
      { $group: { _id: null, totalDoctors: { $sum: 1 }, activeDoctors: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } } } },
    ]),
    DoctorProfile.aggregate([
      { $match: { specialization: { $exists: true, $ne: '' }, isProfileComplete: true } },
      { $group: { _id: { $toLower: '$specialization' } } },
      { $count: 'uniqueSpecializations' },
    ]),
    DoctorProfile.aggregate([
      { $group: { _id: null, profilesComplete: { $sum: { $cond: [{ $eq: ['$isProfileComplete', true] }, 1, 0] } }, profilesIncomplete: { $sum: { $cond: [{ $eq: ['$isProfileComplete', false] }, 1, 0] } } } },
    ]),
  ]);

  const data = {
    totalDoctors: userCounts[0]?.totalDoctors || 0,
    activeDoctors: userCounts[0]?.activeDoctors || 0,
    uniqueSpecializations: specializationRows[0]?.uniqueSpecializations || 0,
    profilesComplete: profileStats?.[0]?.profilesComplete || 0,
    profilesIncomplete: profileStats?.[0]?.profilesIncomplete || 0,
  };

  summaryCache.data = data;
  summaryCache.ts = now;
  res.json({ success: true, data });
});

export const getDoctorAvailability = asyncHandler(async (req, res) => {
  const user = await findDoctorUser(req.params.id);

  const date = String(req.query.date || '').trim();
  if (!date) throw AppError.badRequest('date query parameter is required');

  const requestedDate = parseDateInput(date);
  if (!requestedDate) throw AppError.badRequest('Invalid date');
  const requestedIso = toPakistanISODate(requestedDate);

  const profile = await DoctorProfile.findOne({ userId: user._id }).lean();
  if (!profile) throw AppError.notFound('Doctor profile not found');

  const dayShort = DAY_NAMES_SHORT[new Date(`${requestedIso}T00:00:00+05:00`).getDay()];
  if (!profile.schedule.days.includes(dayShort)) {
    return res.json({ success: true, data: { availableSlots: [] } });
  }

  const [startHour, startMinute] = String(profile.schedule.shiftStart).split(':').map(Number);
  const [endHour, endMinute] = String(profile.schedule.shiftEnd).split(':').map(Number);
  const duration = Number(profile.schedule.consultationDurationMins || 30);

  const shiftStart = new Date(requestedDate);
  shiftStart.setHours(startHour, startMinute, 0, 0);
  const shiftEnd = new Date(requestedDate);
  shiftEnd.setHours(endHour, endMinute, 0, 0);

  const slots = [];
  for (let t = new Date(shiftStart); t < shiftEnd; t = new Date(t.getTime() + duration * 60_000)) {
    slots.push(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
  }

  const bounds = dayBoundsInPakistan(requestedIso);
  const dayStart = bounds?.start || requestedDate;
  const dayEnd = bounds?.end || requestedDate;

  const bookedRows = await mongoose.connection
    .collection('appointments')
    .find(
      { doctorId: toObjectId(user._id), date: { $gte: dayStart, $lte: dayEnd }, status: { $nin: ['Cancelled', 'Missed'] } },
      { projection: { timeSlot: 1, time: 1, slot: 1, startTime: 1 } },
    )
    .toArray()
    .catch(() => []);

  const booked = new Set(
    bookedRows
      .map((r) => {
        const raw = String(r.timeSlot || r.time || r.slot || r.startTime || '');
        return raw.split('-')[0].trim().slice(0, 5);
      })
      .filter((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)),
  );

  res.json({
    success: true,
    data: {
      date,
      day: dayShort,
      shift: `${to12Hour(profile.schedule.shiftStart)} - ${to12Hour(profile.schedule.shiftEnd)}`,
      availableSlots: slots.filter((s) => !booked.has(s)),
    },
  });
});

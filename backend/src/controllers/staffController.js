import mongoose from 'mongoose';

import Patient from '../models/Patient.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { paginationMeta, parseName, parsePagination, searchRegex } from '../utils/query.js';

// ─── Private helpers ──────────────────────────────────────────────────────

const toSafeStaff = (user) => {
  const { firstName, lastName } = parseName(user?.name);
  return {
    _id: user._id,
    name: user.name,
    firstName,
    lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    notes: user.notes || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const findStaffOrFail = async (id) => {
  const user = await User.findOne({ _id: id, role: 'receptionist' });
  if (!user) throw AppError.notFound('Staff not found');
  return user;
};

const appointmentsCol = () => mongoose.connection.collection('appointments');

// ─── Route handlers ───────────────────────────────────────────────────────

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = String(req.query.status || '').trim().toLowerCase();

  const query = { role: 'receptionist' };
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;

  const regex = searchRegex(req.query.search);
  if (regex) query.$or = [{ name: regex }, { email: regex }];

  const [staff, total] = await Promise.all([
    User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: { staff: staff.map(toSafeStaff), pagination: paginationMeta(total, page, limit) },
  });
});

export const getStaffStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const receptionists = await User.find({ role: 'receptionist' }).select('_id name').lean();

  const workloadData = await Promise.all(
    receptionists.map(async (staff) => {
      const [patientsRegistered, appointmentsBooked] = await Promise.all([
        Patient.countDocuments({ registeredBy: staff._id, createdAt: { $gte: startOfMonth } }),
        appointmentsCol().countDocuments({ createdBy: staff._id, createdAt: { $gte: startOfMonth } }),
      ]);
      return { _id: staff._id, name: staff.name, patientsRegistered, appointmentsBooked };
    }),
  );

  const [totalReceptionists, activeReceptionists] = await Promise.all([
    User.countDocuments({ role: 'receptionist' }),
    User.countDocuments({ role: 'receptionist', isActive: true }),
  ]);

  res.json({
    success: true,
    data: { summary: { totalReceptionists, activeReceptionists }, workload: workloadData },
  });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const user = await findStaffOrFail(req.params.id);

  const { firstName: curFirst, lastName: curLast } = parseName(user.name);
  const first = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : curFirst;
  const last = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : curLast;

  user.name = `${first} ${last}`.trim();
  if (typeof req.body.phone === 'string') user.phone = req.body.phone.trim();
  if (typeof req.body.notes === 'string') user.notes = req.body.notes.trim();
  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
  await user.save();

  await auditFromReq(req, 'STAFF_UPDATED', `User:${user._id}`);

  const safe = await User.findById(user._id).select('-password').lean();
  res.json({ success: true, data: toSafeStaff(safe) });
});

export const toggleStaffStatus = asyncHandler(async (req, res) => {
  const user = await findStaffOrFail(req.params.id);

  if (req.user._id.toString() === user._id.toString()) {
    throw AppError.badRequest('You cannot deactivate your own account');
  }

  const nextStatus = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
  user.isActive = nextStatus;
  await user.save();

  await auditFromReq(req, nextStatus ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED', `User:${user._id}`);

  res.json({
    success: true,
    message: nextStatus ? 'Staff activated successfully' : 'Staff deactivated successfully',
    data: { isActive: nextStatus },
  });
});

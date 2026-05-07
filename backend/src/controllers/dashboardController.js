import mongoose from 'mongoose';

import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Invoice from '../models/Invoice.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

import asyncHandler from '../utils/asyncHandler.js';
import { toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';

// ─── Constants / caches ───────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CACHE_TTL = 5 * 60 * 1000;
const revenueCache = {};

// ─── Helpers ──────────────────────────────────────────────────────────────

const startEndOfToday = () => {
  const bounds = todayBoundsInPakistan();
  if (bounds) return { start: bounds.start, end: bounds.end };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setHours(23, 59, 59, 999);
  return { start, end };
};

const parseSlotStart = (timeSlot = '') => String(timeSlot).split('-')[0] || '';

const aggregateInvoiceRange = async (start, end) => {
  const [row] = await Invoice.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, invoiced: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } },
  ]);
  const invoiced = Number(row?.invoiced || 0);
  const collected = Number(row?.collected || 0);
  return { invoiced, collected, pending: Math.max(invoiced - collected, 0) };
};

const withTimeout = async (fn, ms = 3000) =>
  Promise.race([fn(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// ─── Route handlers ───────────────────────────────────────────────────────

export const getKpiStats = asyncHandler(async (_req, res) => {
  if (process.env.NODE_ENV !== 'production') console.time('dashboard:kpi-stats');
  const { start: today, end: todayEnd } = startEndOfToday();

  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const yesterdayStart = new Date(today); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(today); yesterdayEnd.setMilliseconds(-1);

  const [
    totalPatients, newPatientsThisWeek, newPatientsLastWeek,
    todayAppointments, todayCompleted,
    activeDoctors, completeDoctors,
    revenueTodayRows, revenueYesterdayRows,
    pendingInvoicesCount, pendingAmountRows,
    missedToday,
  ] = await Promise.all([
    Patient.countDocuments({ isArchived: false }),
    Patient.countDocuments({ createdAt: { $gte: weekAgo }, isArchived: false }),
    Patient.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo }, isArchived: false }),
    Appointment.countDocuments({ date: { $gte: today, $lte: todayEnd } }),
    Appointment.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: 'Completed' }),
    User.countDocuments({ role: 'doctor', isActive: true }),
    DoctorProfile.countDocuments({ isProfileComplete: true }),
    Invoice.aggregate([{ $match: { createdAt: { $gte: today, $lte: todayEnd } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    Invoice.aggregate([{ $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    Invoice.countDocuments({ paymentStatus: { $in: ['Unpaid', 'Partial'] } }),
    Invoice.aggregate([{ $match: { paymentStatus: { $in: ['Unpaid', 'Partial'] } } }, { $group: { _id: null, pending: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } }]),
    Appointment.countDocuments({ status: 'Missed', date: { $gte: today, $lte: todayEnd } }),
  ]);

  const todayRevenue = Number(revenueTodayRows?.[0]?.total || 0);
  const yesterdayRevenue = Number(revenueYesterdayRows?.[0]?.total || 0);
  const patientsWeekTrend = newPatientsLastWeek > 0
    ? Math.round(((newPatientsThisWeek - newPatientsLastWeek) / newPatientsLastWeek) * 100)
    : 0;

  if (process.env.NODE_ENV !== 'production') console.timeEnd('dashboard:kpi-stats');

  res.json({
    success: true,
    data: {
      totalPatients, newPatientsThisWeek, patientsWeekTrend,
      todayAppointments, todayCompleted, todayRemaining: Math.max(todayAppointments - todayCompleted, 0),
      activeDoctors, completeDoctors,
      revenueToday: todayRevenue, revenueDiff: todayRevenue - yesterdayRevenue,
      pendingInvoicesCount, pendingAmount: Number(pendingAmountRows?.[0]?.pending || 0),
      missedToday,
    },
  });
});

export const getRevenueChart = asyncHandler(async (req, res) => {
  const period = String(req.query.period || '6m').toLowerCase();
  if (revenueCache[period] && Date.now() - revenueCache[period].ts < CACHE_TTL) {
    return res.json({ success: true, data: revenueCache[period].data });
  }

  const now = new Date();

  if (period === '1m') {
    const data = await Promise.all(
      Array.from({ length: 30 }, (_, idx) => {
        const day = new Date(now); day.setDate(now.getDate() - (29 - idx)); day.setHours(0, 0, 0, 0);
        const end = new Date(day); end.setHours(23, 59, 59, 999);
        return aggregateInvoiceRange(day, end).then((t) => ({
          date: toPakistanISODate(day),
          label: `${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`,
          ...t,
        }));
      }),
    );
    const payload = { chartData: data, period: '1m' };
    revenueCache[period] = { data: payload, ts: Date.now() };
    return res.json({ success: true, data: payload });
  }

  const months = period === '3m' ? 3 : 6;
  const chartData = await Promise.all(
    Array.from({ length: months }, (_, idx) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (months - 1 - idx), 1);
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
      return aggregateInvoiceRange(start, end).then((t) => ({
        month: m.getMonth() + 1, year: m.getFullYear(), label: MONTH_SHORT[m.getMonth()], ...t,
      }));
    }),
  );

  const payload = { chartData, period: months === 3 ? '3m' : '6m' };
  revenueCache[period] = { data: payload, ts: Date.now() };
  res.json({ success: true, data: payload });
});

export const getAppointmentStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const breakdown = await Appointment.aggregate([
    { $match: { date: { $gte: startOfMonth } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const count = (status) => Number(breakdown.find((b) => b._id === status)?.count || 0);
  const total = breakdown.reduce((s, b) => s + Number(b.count || 0), 0);
  const completed = count('Completed');
  const scheduled = count('Scheduled');
  const missed = count('Missed');
  const checkedIn = count('Checked-In');
  const inProgress = count('In-Progress');

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const attendancePool = scheduled + completed + missed + checkedIn + inProgress;
  const attendanceRate = attendancePool > 0
    ? Math.round(((completed + checkedIn + inProgress) / attendancePool) * 100)
    : 0;

  res.json({ success: true, data: { breakdown, total, completionRate, attendanceRate } });
});

export const getTodaysSchedule = asyncHandler(async (_req, res) => {
  const { start: today, end: todayEnd } = startEndOfToday();
  const appointments = await Appointment.find({ date: { $gte: today, $lte: todayEnd } })
    .select('patientId doctorId date timeSlot status')
    .populate('patientId', 'name patientId patientCode')
    .populate('doctorId', 'name')
    .sort({ timeSlot: 1 })
    .limit(20)
    .lean();

  const doctorIds = [...new Set(appointments.map((a) => String(a.doctorId?._id || '')).filter(Boolean))];
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean();
  const map = new Map(profiles.map((p) => [String(p.userId), p.specialization || '']));

  const enriched = appointments
    .map((a) => ({ ...a, doctorSpecialization: map.get(String(a.doctorId?._id || '')) || '' }))
    .sort((a, b) => parseSlotStart(a.timeSlot).localeCompare(parseSlotStart(b.timeSlot)));

  res.json({ success: true, data: enriched });
});

export const getRecentPatients = asyncHandler(async (_req, res) => {
  const patients = await Patient.find({ isArchived: false })
    .sort({ createdAt: -1 }).limit(5)
    .select('name patientId patientCode user userId createdAt')
    .lean();

  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [thisWeekCount, thisMonthCount] = await Promise.all([
    Patient.countDocuments({ isArchived: false, createdAt: { $gte: startOfWeek } }),
    Patient.countDocuments({ isArchived: false, createdAt: { $gte: startOfMonth } }),
  ]);

  res.json({ success: true, data: { patients, thisWeekCount, thisMonthCount } });
});

export const getSystemHealth = asyncHandler(async (_req, res) => {
  const { start: todayStart, end: todayEnd } = startEndOfToday();

  const checks = await Promise.allSettled([
    withTimeout(async () => {
      const t = Date.now();
      await Patient.findOne().select('_id').lean();
      return { service: 'Database Connection', status: 'Connected', responseMs: Date.now() - t };
    }),
    withTimeout(async () => {
      const t = Date.now();
      const base = String(process.env.AI_SERVICE_URL || '').trim();
      if (!base) return { service: 'AI Microservice', status: 'Offline', responseMs: null, warning: 'AI summarization unavailable' };
      await fetch(`${base}/api/health`);
      const ms = Date.now() - t;
      return {
        service: 'AI Microservice',
        status: ms > 2000 ? 'Slow' : 'Online',
        responseMs: ms,
        warning: ms > 2000 ? 'AI responses are slower than expected' : '',
      };
    }),
    withTimeout(async () => ({
      service: 'Email Service',
      status: (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? 'Configured' : 'Not Configured',
      responseMs: null,
    })),
    withTimeout(async () => {
      const lastLog = await AuditLog.findOne({ action: 'CRON_MISSED_APPOINTMENTS' }).sort({ createdAt: -1 }).lean();
      return { service: 'Scheduled Jobs', status: 'Active', responseMs: null, lastRun: lastLog?.createdAt || null };
    }),
  ]);

  const [auditToday, totalUsers, collectionsInfo] = await Promise.all([
    AuditLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    User.countDocuments(),
    mongoose.connection.db.listCollections().toArray(),
  ]);

  const uri = String(process.env.MONGO_URI || '');

  res.json({
    success: true,
    data: {
      checks: checks.map((c) => (c.status === 'fulfilled' ? c.value : { service: 'Unknown Service', status: 'Error', responseMs: null })),
      auditToday,
      totalUsers,
      collectionsCount: collectionsInfo.length,
      storageNote: uri.includes('mongodb+srv') ? 'Connected to MongoDB Atlas' : 'Running on local MongoDB',
    },
  });
});

export const getRecentActivity = asyncHandler(async (_req, res) => {
  const logs = await AuditLog.find()
    .select('action target createdAt userId')
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'name role')
    .lean();
  res.json({ success: true, data: logs });
});

export const getPendingActions = asyncHandler(async (_req, res) => {
  const { start: today, end: todayEnd } = startEndOfToday();

  const [unpaidInvoices, missedToday, incompleteProfiles] = await Promise.all([
    Invoice.countDocuments({ paymentStatus: { $in: ['Unpaid', 'Partial'] } }),
    Appointment.countDocuments({ status: 'Missed', date: { $gte: today, $lte: todayEnd } }),
    DoctorProfile.countDocuments({ isProfileComplete: false }),
  ]);

  res.json({ success: true, data: { unpaidInvoices, missedToday, incompleteProfiles } });
});


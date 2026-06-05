import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Invoice from '../models/Invoice.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { dayBoundsInPakistan, toPakistanISODate } from '../utils/dateTime.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const parseRange = (fromRaw, toRaw) => {
  const today = new Date();
  const todayIso = toPakistanISODate(today);
  const firstOfMonthIso = `${todayIso.slice(0, 8)}01`;
  const from = dayBoundsInPakistan(fromRaw || firstOfMonthIso);
  const to = dayBoundsInPakistan(toRaw || todayIso);
  return { from: from?.start || startOfDay(today), to: to?.end || endOfDay(today) };
};

const previousRange = (from, to) => {
  const spanMs = Math.max(endOfDay(to).getTime() - startOfDay(from).getTime() + 1, DAY_MS);
  const prevTo = new Date(startOfDay(from).getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs + 1);
  return { prevFrom: startOfDay(prevFrom), prevTo: endOfDay(prevTo) };
};

const pctChange = (current, previous) => {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));

/** Keeps collected ≤ invoiced and collection rate in [0, 100] for display sanity. */
const normalizeInvoiceAmounts = (invoicedRaw, collectedRaw) => {
  const invoiced = Math.max(0, Number(invoicedRaw || 0));
  const collected = Math.min(Math.max(0, Number(collectedRaw || 0)), invoiced);
  return {
    invoiced,
    collected,
    outstanding: Math.max(invoiced - collected, 0),
    collectionRate: invoiced > 0
      ? Math.min(100, Math.round((collected / invoiced) * 100))
      : 0,
  };
};

const getOutstandingMatch = {
  paymentStatus: { $in: ['Unpaid', 'Partial'] },
};

const sumInvoiceOutstanding = async (match) => {
  const [row] = await Invoice.aggregate([
    { $match: match },
    {
      $project: {
        outstanding: {
          $max: [{ $subtract: ['$totalAmount', '$paidAmount'] }, 0],
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$outstanding' } } },
  ]);
  return Number(row?.total || 0);
};

const getGroupingFormat = (groupBy, from, to) => {
  if (groupBy === 'daily') return '%Y-%m-%d';
  if (groupBy === 'weekly') return '%Y-%U';
  if (groupBy === 'monthly') return '%Y-%m';
  const diffDays = Math.max(1, Math.ceil((endOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS));
  if (diffDays <= 31) return '%Y-%m-%d';
  if (diffDays <= 90) return '%Y-%U';
  return '%Y-%m';
};

const getDateGroupExpr = (format) => ({
  $dateToString: {
    format,
    date: '$bucketDate',
    timezone: 'Asia/Karachi',
  },
});

const computeGrowth = (current, prev) => {
  if (!prev && !current) return 0;
  if (!prev) return 100;
  return Number((((current - prev) / prev) * 100).toFixed(1));
};

export const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);
  const { prevFrom, prevTo } = previousRange(from, to);

  const [
    patientsCurrent, patientsPrev, apptCurrent, apptPrev, revenueRowsCurrent, revenueRowsPrev, completedCurrent, completedPrev,
    totalPatientsAllTime,
  ] = await Promise.all([
    Patient.countDocuments({ isArchived: false, createdAt: { $gte: from, $lte: to } }),
    Patient.countDocuments({ isArchived: false, createdAt: { $gte: prevFrom, $lte: prevTo } }),
    Appointment.countDocuments({ date: { $gte: from, $lte: to } }),
    Appointment.countDocuments({ date: { $gte: prevFrom, $lte: prevTo } }),
    Invoice.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Invoice.aggregate([{ $match: { createdAt: { $gte: prevFrom, $lte: prevTo } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Appointment.countDocuments({ status: 'Completed', date: { $gte: from, $lte: to } }),
    Appointment.countDocuments({ status: 'Completed', date: { $gte: prevFrom, $lte: prevTo } }),
    Patient.countDocuments({ isArchived: false }),
  ]);

  const [outstandingCurrent, outstandingPrev] = await Promise.all([
    sumInvoiceOutstanding({ ...getOutstandingMatch, createdAt: { $gte: from, $lte: to } }),
    sumInvoiceOutstanding({ ...getOutstandingMatch, createdAt: { $gte: prevFrom, $lte: prevTo } }),
  ]);

  const revenueCurrent = Number(revenueRowsCurrent?.[0]?.total || 0);
  const revenuePrev = Number(revenueRowsPrev?.[0]?.total || 0);
  const completionRateCurrent = apptCurrent > 0 ? Number(((completedCurrent / apptCurrent) * 100).toFixed(1)) : 0;
  const completionRatePrev = apptPrev > 0 ? Number(((completedPrev / apptPrev) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    data: {
      range: { from, to, prevFrom, prevTo },
      totalPatients: { value: totalPatientsAllTime, trend: pctChange(patientsCurrent, patientsPrev) },
      appointments: { value: apptCurrent, trend: pctChange(apptCurrent, apptPrev) },
      revenue: { value: revenueCurrent, trend: pctChange(revenueCurrent, revenuePrev) },
      completionRate: { value: completionRateCurrent, trend: pctChange(completionRateCurrent, completionRatePrev) },
      outstanding: { value: outstandingCurrent, trend: pctChange(outstandingCurrent, outstandingPrev) },
    },
  });
});

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);
  const diffDays = Math.max(1, Math.ceil((endOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS));
  const granularity = diffDays <= 31 ? 'day' : diffDays <= 90 ? 'week' : 'month';

  const dateFmt = granularity === 'day' ? '%Y-%m-%d' : granularity === 'week' ? '%Y-%U' : '%Y-%m';
  const dateExpr = {
    $dateToString: {
      format: dateFmt,
      date: '$bucketDate',
      timezone: 'Asia/Karachi',
    },
  };
  const rangeSpanMs = endOfDay(to).getTime() - startOfDay(from).getTime() + 1;
  const previousPatientsFrom = new Date(startOfDay(from).getTime() - rangeSpanMs);
  const previousPatientsTo = new Date(startOfDay(from).getTime() - 1);

  const [patientSeries, appointmentSeries, invoiceSeries, statusBreakdown, revenueSplit, topSpecializations, paidInvoiceRows, totalInvoices, activeDoctors, totalDoctors, patientsCurrent, patientsPrev] = await Promise.all([
    Patient.aggregate([
      { $match: { isArchived: false, createdAt: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$createdAt' } },
      { $group: { _id: dateExpr, patients: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$date' } },
      { $group: { _id: dateExpr, appointments: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$createdAt', invoices: 1, totalAmount: 1 } },
      { $group: { _id: dateExpr, invoices: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: 'doctorprofiles',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      {
        $project: {
          specialization: {
            $ifNull: [{ $arrayElemAt: ['$profile.specialization', 0] }, 'General'],
          },
        },
      },
      { $group: { _id: '$specialization', appointments: { $sum: 1 } } },
      { $sort: { appointments: -1 } },
      { $limit: 5 },
    ]),
    Invoice.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $group: { _id: null, paid: { $sum: '$paidAmount' } } }]),
    Invoice.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    DoctorProfile.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'doctor' }),
    Patient.countDocuments({ isArchived: false, createdAt: { $gte: from, $lte: to } }),
    Patient.countDocuments({
      isArchived: false,
      createdAt: {
        $gte: previousPatientsFrom,
        $lte: previousPatientsTo,
      },
    }),
  ]);

  const mergedMap = new Map();
  const absorb = (rows, key, val) => {
    rows.forEach((row) => {
      const existing = mergedMap.get(row._id) || { bucket: row._id, patients: 0, appointments: 0, invoices: 0, revenue: 0 };
      existing[key] = Number(row[val] || 0);
      mergedMap.set(row._id, existing);
    });
  };

  absorb(patientSeries, 'patients', 'patients');
  absorb(appointmentSeries, 'appointments', 'appointments');
  absorb(invoiceSeries, 'invoices', 'invoices');
  invoiceSeries.forEach((row) => {
    const existing = mergedMap.get(row._id) || { bucket: row._id, patients: 0, appointments: 0, invoices: 0, revenue: 0 };
    existing.revenue = Number(row.revenue || 0);
    mergedMap.set(row._id, existing);
  });

  const activityOverTime = Array.from(mergedMap.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));

  const statusCount = (status) => Number(statusBreakdown.find((b) => b._id === status)?.count || 0);
  const totalAppointments = statusBreakdown.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const completedCount = statusCount('Completed');
  const checkedInCount = statusCount('Checked-In');
  const inProgressCount = statusCount('In-Progress');
  const cancelledCount = statusCount('Cancelled');
  const completionRate = totalAppointments > 0 ? (completedCount / totalAppointments) * 100 : 0;
  const attendancePool = totalAppointments - cancelledCount;
  const attendanceRate = attendancePool > 0 ? ((completedCount + checkedInCount + inProgressCount) / attendancePool) * 100 : 0;
  const totalInvoicedAmount = revenueSplit.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidAmountRaw = Number(paidInvoiceRows?.[0]?.paid || 0);
  const paidAmount = Math.min(paidAmountRaw, totalInvoicedAmount);
  const invoiceCollectionRate = totalInvoicedAmount > 0 ? (paidAmount / totalInvoicedAmount) * 100 : 0;
  const doctorAvailability = totalDoctors > 0 ? (activeDoctors / totalDoctors) * 100 : 0;
  const patientGrowthRate = clampPercent(pctChange(patientsCurrent, patientsPrev));

  res.json({
    success: true,
    data: {
      granularity,
      activityOverTime,
      performanceSnapshot: {
        completionRate: clampPercent(completionRate),
        attendanceRate: clampPercent(attendanceRate),
        invoiceCollectionRate: clampPercent(invoiceCollectionRate),
        doctorAvailability: clampPercent(doctorAvailability),
        patientGrowthRate,
      },
      appointmentStatusBreakdown: statusBreakdown.map((item) => ({ status: item._id, count: Number(item.count || 0) })),
      revenueSplit: revenueSplit.map((item) => ({ status: item._id, count: Number(item.count || 0), amount: Number(item.amount || 0) })),
      topSpecializations: topSpecializations.map((item) => ({ specialization: item._id || 'General', appointments: Number(item.appointments || 0) })),
      totals: {
        appointments: totalAppointments,
        invoices: totalInvoices,
        invoicedAmount: totalInvoicedAmount,
      },
    },
  });
});

export const getAnalyticsPatients = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);
  const format = getGroupingFormat(req.query.groupBy, from, to);
  const dateExpr = getDateGroupExpr(format);

  const [registrationsByPeriod, demographics, bloodGroups, statusCounts, basePatientCount] = await Promise.all([
    Patient.aggregate([
      { $match: { isArchived: false, createdAt: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$createdAt', status: '$status' } },
      {
        $group: {
          _id: dateExpr,
          newPatients: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $ne: ['$status', 'Active'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Patient.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ]),
    Patient.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: { $ifNull: ['$bloodGroup', ''] }, count: { $sum: 1 } } },
    ]),
    Patient.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Patient.countDocuments({ isArchived: false, createdAt: { $lt: from } }),
  ]);

  let cumulative = basePatientCount;
  const rowsAsc = registrationsByPeriod.map((row, idx, arr) => {
    cumulative += Number(row.newPatients || 0);
    const prev = idx > 0 ? Number(arr[idx - 1].newPatients || 0) : 0;
    return {
      period: row._id,
      newPatients: Number(row.newPatients || 0),
      cumulative,
      growthPct: computeGrowth(Number(row.newPatients || 0), prev),
      active: Number(row.active || 0),
      inactive: Number(row.inactive || 0),
    };
  });

  const tableRows = [...rowsAsc].reverse();
  const totalNewPatients = rowsAsc.reduce((sum, r) => sum + r.newPatients, 0);
  const totalRow = {
    period: 'TOTAL',
    newPatients: totalNewPatients,
    cumulative,
    growthPct: rowsAsc.length ? Number((rowsAsc.reduce((sum, r) => sum + Number(r.growthPct || 0), 0) / rowsAsc.length).toFixed(1)) : 0,
    active: rowsAsc.reduce((sum, r) => sum + r.active, 0),
    inactive: rowsAsc.reduce((sum, r) => sum + r.inactive, 0),
  };

  const peak = rowsAsc.reduce((best, row) => (row.newPatients > (best?.newPatients || 0) ? row : best), null);
  const avgGrowth = rowsAsc.length ? Number((rowsAsc.reduce((sum, r) => sum + Number(r.growthPct || 0), 0) / rowsAsc.length).toFixed(1)) : 0;

  const normalizeGender = (g) => {
    const v = String(g || '').toLowerCase();
    if (v === 'male') return 'Male';
    if (v === 'female') return 'Female';
    return 'Other';
  };

  const genderMap = new Map();
  demographics.forEach((row) => {
    const key = normalizeGender(row._id);
    genderMap.set(key, Number(genderMap.get(key) || 0) + Number(row.count || 0));
  });

  const bloodOrder = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];
  const bloodMap = new Map();
  let unspecifiedBloodCount = 0;
  bloodGroups.forEach((bg) => {
    const key = String(bg._id || '').trim();
    if (!key || !bloodOrder.includes(key)) {
      unspecifiedBloodCount += Number(bg.count || 0);
    } else {
      bloodMap.set(key, Number(bg.count || 0));
    }
  });

  const bloodGroupResults = bloodOrder.map((bg) => ({ group: bg, count: Number(bloodMap.get(bg) || 0) }));
  if (unspecifiedBloodCount > 0) {
    bloodGroupResults.push({ group: 'N/A', count: unspecifiedBloodCount });
  }

  res.json({
    success: true,
    data: {
      chart: rowsAsc,
      demographics: {
        gender: ['Male', 'Female', 'Other'].map((key) => ({ name: key, count: Number(genderMap.get(key) || 0) })),
        bloodGroups: bloodGroupResults,
      },
      table: {
        rows: tableRows,
        total: totalRow,
      },
      insights: {
        peakRegistrationMonth: peak
          ? { period: peak.period, newPatients: peak.newPatients }
          : { period: '-', newPatients: 0 },
        averageMonthlyGrowth: avgGrowth,
      },
      statusSummary: statusCounts.map((s) => ({ status: s._id || 'Unknown', count: Number(s.count || 0) })),
    },
  });
});

export const getAnalyticsAppointments = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);
  const volumeFormat = getGroupingFormat(req.query.volumeGroupBy, from, to);
  const dateExpr = getDateGroupExpr(volumeFormat);

  const [statusRows, volumeRows, heatAppointments, doctorRows] = await Promise.all([
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$date', status: 1 } },
      {
        $group: {
          _id: { period: dateExpr, status: '$status' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]),
    Appointment.find({ date: { $gte: from, $lte: to } }).select('date timeSlot').lean(),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      {
        $lookup: {
          from: 'doctorprofiles',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      {
        $project: {
          doctorId: 1,
          status: 1,
          doctorName: { $ifNull: [{ $arrayElemAt: ['$doctor.name', 0] }, 'Unknown Doctor'] },
          specialization: { $ifNull: [{ $arrayElemAt: ['$profile.specialization', 0] }, 'General'] },
          date: 1,
        },
      },
      {
        $group: {
          _id: '$doctorId',
          doctor: { $first: '$doctorName' },
          specialization: { $first: '$specialization' },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Karachi' } } },
        },
      },
      {
        $project: {
          doctor: 1,
          specialization: 1,
          total: 1,
          completed: 1,
          missed: 1,
          cancelled: 1,
          completionPct: {
            $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0],
          },
          avgPerDay: {
            $cond: [{ $gt: [{ $size: '$uniqueDays' }, 0] }, { $divide: ['$total', { $size: '$uniqueDays' }] }, 0],
          },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const statusMap = new Map(statusRows.map((r) => [r._id, Number(r.count || 0)]));
  const scheduled = Number(statusMap.get('Scheduled') || 0);
  const completed = Number(statusMap.get('Completed') || 0);
  const missed = Number(statusMap.get('Missed') || 0);
  const cancelled = Number(statusMap.get('Cancelled') || 0);
  const total = statusRows.reduce((sum, r) => sum + Number(r.count || 0), 0);

  const volumeMap = new Map();
  volumeRows.forEach((row) => {
    const period = row._id.period;
    const existing = volumeMap.get(period) || { period, completed: 0, missed: 0, cancelled: 0 };
    const count = Number(row.count || 0);
    if (row._id.status === 'Completed') existing.completed = count;
    if (row._id.status === 'Missed') existing.missed = count;
    if (row._id.status === 'Cancelled') existing.cancelled = count;
    volumeMap.set(period, existing);
  });
  const volume = Array.from(volumeMap.values()).sort((a, b) => a.period.localeCompare(b.period));

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const days = [
    { iso: 1, label: 'Mon' },
    { iso: 2, label: 'Tue' },
    { iso: 3, label: 'Wed' },
    { iso: 4, label: 'Thu' },
    { iso: 5, label: 'Fri' },
    { iso: 6, label: 'Sat' },
    { iso: 7, label: 'Sun' },
  ];
  const heatMapRows = [];
  const slotHour = (slot) => {
    const text = String(slot || '').split('-')[0].trim();
    const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!m) return null;
    let hour = Number(m[1]);
    const mer = String(m[3] || '').toUpperCase();
    if (mer === 'PM' && hour < 12) hour += 12;
    if (mer === 'AM' && hour === 12) hour = 0;
    if (!mer && hour >= 0 && hour <= 23) return hour;
    if (mer) return hour;
    return null;
  };
  const heatLookup = new Map();
  heatAppointments.forEach((appt) => {
    const day = new Date(appt.date).getDay();
    const iso = day === 0 ? 7 : day;
    const hour = slotHour(appt.timeSlot);
    if (hour === null || hour < 8 || hour > 18) return;
    const key = `${iso}-${hour}`;
    heatLookup.set(key, Number(heatLookup.get(key) || 0) + 1);
  });
  days.forEach((day) => {
    hours.forEach((hour) => {
      heatMapRows.push({
        day: day.label,
        dayNum: day.iso,
        hour,
        hourLabel: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
        count: Number(heatLookup.get(`${day.iso}-${hour}`) || 0),
      });
    });
  });
  const maxHeat = heatMapRows.reduce((max, cell) => Math.max(max, cell.count), 0);

  const doctorTable = doctorRows.map((row) => ({
    doctor: row.doctor,
    specialization: row.specialization,
    total: Number(row.total || 0),
    completed: Number(row.completed || 0),
    missed: Number(row.missed || 0),
    cancelled: Number(row.cancelled || 0),
    completionPct: Number(Number(row.completionPct || 0).toFixed(1)),
    avgPerDay: Number(Number(row.avgPerDay || 0).toFixed(2)),
  }));

  const totals = doctorTable.reduce((acc, row) => ({
    total: acc.total + row.total,
    completed: acc.completed + row.completed,
    missed: acc.missed + row.missed,
    cancelled: acc.cancelled + row.cancelled,
  }), { total: 0, completed: 0, missed: 0, cancelled: 0 });

  res.json({
    success: true,
    data: {
      stats: {
        scheduled,
        completed,
        missed,
        cancelled,
        total,
      },
      volume,
      heatmap: {
        rows: heatMapRows,
        max: maxHeat,
        hours,
        days: days.map((d) => d.label),
      },
      doctorSummary: {
        rows: doctorTable,
        totals: {
          ...totals,
          completionPct: totals.total > 0 ? Number(((totals.completed / totals.total) * 100).toFixed(1)) : 0,
        },
      },
    },
  });
});

export const getAnalyticsRevenue = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);
  const trendFormat = getGroupingFormat(req.query.trendGroupBy, from, to);
  const trendExpr = getDateGroupExpr(trendFormat);
  const tableView = String(req.query.tableView || 'month').toLowerCase();

  const [totalsRows, trendRows, paymentMethodRows, byMonthRows, byDoctorRows, byPatientRows] = await Promise.all([
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          invoices: { $sum: 1 },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $project: { bucketDate: '$createdAt', totalAmount: 1, paidAmount: 1 } },
      {
        $group: {
          _id: trendExpr,
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          invoices: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, paymentMethod: { $ne: null } } },
      { $group: { _id: '$paymentMethod', amount: { $sum: '$paidAmount' } } },
      { $sort: { amount: -1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
              timezone: 'Asia/Karachi',
            },
          },
          invoices: { $sum: 1 },
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      {
        $lookup: {
          from: 'doctorprofiles',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      {
        $group: {
          _id: '$doctorId',
          doctor: { $first: { $ifNull: [{ $arrayElemAt: ['$doctor.name', 0] }, 'Unknown Doctor'] } },
          specialization: { $first: { $ifNull: [{ $arrayElemAt: ['$profile.specialization', 0] }, 'General'] } },
          consultations: { $sum: 1 },
          revenueGenerated: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          doctor: 1,
          specialization: 1,
          consultations: 1,
          revenueGenerated: 1,
          avgPerConsultation: {
            $cond: [{ $gt: ['$consultations', 0] }, { $divide: ['$revenueGenerated', '$consultations'] }, 0],
          },
        },
      },
      { $sort: { revenueGenerated: -1 } },
    ]),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      {
        $group: {
          _id: '$patientId',
          patient: { $first: { $ifNull: [{ $arrayElemAt: ['$patient.name', 0] }, 'Unknown Patient'] } },
          code: { $first: { $ifNull: [{ $arrayElemAt: ['$patient.patientCode', 0] }, '-'] } },
          visits: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastVisit: { $max: { $arrayElemAt: ['$appointment.date', 0] } },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 },
    ]),
  ]);

  const totalsRaw = totalsRows?.[0] || { invoiced: 0, collected: 0, invoices: 0 };
  const totalsNorm = normalizeInvoiceAmounts(totalsRaw.invoiced, totalsRaw.collected);
  const outstanding = totalsNorm.outstanding;
  const avgPerVisit = Number(totalsRaw.invoices || 0) > 0 ? totalsNorm.invoiced / Number(totalsRaw.invoices || 0) : 0;
  const collectionRate = totalsNorm.collectionRate;

  const trend = trendRows.map((row) => {
    const n = normalizeInvoiceAmounts(row.invoiced, row.collected);
    return {
      period: row._id,
      invoiced: n.invoiced,
      collected: n.collected,
      outstanding: n.outstanding,
      invoices: Number(row.invoices || 0),
    };
  });

  const paymentTotal = paymentMethodRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paymentMethods = paymentMethodRows.map((row) => ({
    method: row._id,
    amount: Number(row.amount || 0),
    pct: paymentTotal > 0 ? Number(((Number(row.amount || 0) / paymentTotal) * 100).toFixed(1)) : 0,
  }));

  const byMonth = byMonthRows.map((row, idx, arr) => {
    const prev = idx > 0 ? Number(arr[idx - 1].invoiced || 0) : 0;
    const n = normalizeInvoiceAmounts(row.invoiced, row.collected);
    return {
      month: row._id,
      invoices: Number(row.invoices || 0),
      invoiced: n.invoiced,
      collected: n.collected,
      outstanding: n.outstanding,
      collectionRate: n.collectionRate,
      vsPrevMonth: computeGrowth(n.invoiced, prev),
    };
  });

  const bestMonth = byMonth.reduce((best, row) => (row.invoiced > (best?.invoiced || 0) ? row : best), null);

  res.json({
    success: true,
    data: {
      stats: {
        totalInvoiced: totalsNorm.invoiced,
        totalCollected: totalsNorm.collected,
        outstanding,
        avgPerVisit: Number(avgPerVisit.toFixed(1)),
      },
      trend,
      paymentMethods,
      tableView,
      table: tableView === 'doctor'
        ? byDoctorRows.map((row) => ({
          doctor: row.doctor,
          specialization: row.specialization,
          consultations: Number(row.consultations || 0),
          revenueGenerated: Number(row.revenueGenerated || 0),
          avgPerConsultation: Number(Number(row.avgPerConsultation || 0).toFixed(1)),
        }))
        : tableView === 'patient'
          ? byPatientRows.map((row) => ({
            patient: row.patient,
            code: row.code || '-',
            visits: Number(row.visits || 0),
            totalSpent: Number(row.totalSpent || 0),
            lastVisit: row.lastVisit || null,
          }))
          : byMonth,
      insights: {
        bestPerformingMonth: bestMonth
          ? { month: bestMonth.month, amount: bestMonth.invoiced }
          : { month: '-', amount: 0 },
        collectionEfficiency: clampPercent(collectionRate),
      },
    },
  });
});

export const getAnalyticsDoctors = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query.from, req.query.to);

  const [doctorPerf, trendRows] = await Promise.all([
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      {
        $lookup: {
          from: 'doctorprofiles',
          localField: 'doctorId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'appointmentId',
          as: 'invoice',
        },
      },
      {
        $project: {
          doctorId: 1,
          status: 1,
          date: 1,
          doctorName: { $ifNull: [{ $arrayElemAt: ['$doctor.name', 0] }, 'Unknown Doctor'] },
          isActive: { $ifNull: [{ $arrayElemAt: ['$profile.isActive', 0] }, true] },
          specialization: { $ifNull: [{ $arrayElemAt: ['$profile.specialization', 0] }, 'General'] },
          revenue: { $ifNull: [{ $arrayElemAt: ['$invoice.totalAmount', 0] }, 0] },
        },
      },
      {
        $group: {
          _id: '$doctorId',
          doctor: { $first: '$doctorName' },
          specialization: { $first: '$specialization' },
          isActive: { $first: '$isActive' },
          totalAppts: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Karachi' } } },
          revenueGenerated: { $sum: '$revenue' },
        },
      },
      {
        $project: {
          doctor: 1,
          specialization: 1,
          isActive: 1,
          totalAppts: 1,
          completed: 1,
          missed: 1,
          cancelled: 1,
          completionPct: {
            $cond: [{ $gt: ['$totalAppts', 0] }, { $multiply: [{ $divide: ['$completed', '$totalAppts'] }, 100] }, 0],
          },
          avgPatientsPerDay: {
            $cond: [{ $gt: [{ $size: '$uniqueDays' }, 0] }, { $divide: ['$totalAppts', { $size: '$uniqueDays' }] }, 0],
          },
          revenueGenerated: 1,
        },
      },
      { $sort: { totalAppts: -1 } },
    ]),
    Appointment.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            doctorId: '$doctorId',
            period: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: 'Asia/Karachi',
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]),
  ]);

  const trendByDoctor = new Map();
  trendRows.forEach((row) => {
    const doctorId = String(row._id.doctorId);
    if (!trendByDoctor.has(doctorId)) trendByDoctor.set(doctorId, []);
    trendByDoctor.get(doctorId).push({ period: row._id.period, count: Number(row.count || 0) });
  });

  const rows = doctorPerf.map((row, idx) => ({
    rank: idx + 1,
    medal: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null,
    doctorId: String(row._id),
    doctor: row.doctor,
    specialization: row.specialization,
    status: row.isActive ? 'Active' : 'Inactive',
    totalAppts: Number(row.totalAppts || 0),
    completed: Number(row.completed || 0),
    missed: Number(row.missed || 0),
    cancelled: Number(row.cancelled || 0),
    completionPct: Number(Number(row.completionPct || 0).toFixed(1)),
    avgPatientsPerDay: Number(Number(row.avgPatientsPerDay || 0).toFixed(2)),
    revenueGenerated: Number(row.revenueGenerated || 0),
    sparkline: trendByDoctor.get(String(row._id)) || [],
    avgRating: 4.3,
  }));

  res.json({
    success: true,
    data: {
      cards: rows,
      consultationVolume: rows.map((r) => ({
        doctor: r.doctor,
        consultations: r.totalAppts,
        completionPct: r.completionPct,
      })),
      workloadDistribution: rows.map((r) => ({
        doctor: r.doctor,
        completed: r.completed,
        missed: r.missed,
        cancelled: r.cancelled,
      })),
      table: rows,
    },
  });
});

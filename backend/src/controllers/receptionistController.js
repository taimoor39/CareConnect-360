import Appointment from '../models/Appointment.js';
import Invoice from '../models/Invoice.js';
import Patient from '../models/Patient.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getTodayRangePKT, todayBoundsInPakistan } from '../utils/dateTime.js';

export const getDashboardStats = asyncHandler(async (_req, res) => {
  const range = getTodayRangePKT() || todayBoundsInPakistan();
  if (!range?.start || !range?.end) throw AppError.internal('Could not resolve today range (PKT)');
  const { start, end } = range;

  const registeredTodayStart = new Date();
  registeredTodayStart.setHours(0, 0, 0, 0);

  const [todayTotal, waitingCount, registeredToday, pendingPayments] = await Promise.all([
    Appointment.countDocuments({ date: { $gte: start, $lte: end } }),
    Appointment.countDocuments({ date: { $gte: start, $lte: end }, status: 'Checked-In' }),
    Patient.countDocuments({ createdAt: { $gte: registeredTodayStart }, isArchived: false }),
    Invoice.countDocuments({ paymentStatus: { $in: ['Unpaid', 'Partial'] } }),
  ]);

  const checkedInToday = await Appointment.countDocuments({
    date: { $gte: start, $lte: end },
    status: { $in: ['Checked-In', 'In-Progress', 'Completed'] },
  });

  res.json({
    success: true,
    data: {
      todayTotal,
      waitingCount,
      checkedInToday,
      remainingToday: Math.max(0, todayTotal - checkedInToday),
      registeredToday,
      pendingPayments,
    },
  });
});

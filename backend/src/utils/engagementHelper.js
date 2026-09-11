import mongoose from 'mongoose';

import EngagementLog from '../models/EngagementLog.js';
import { todayBoundsInPakistan } from './dateTime.js';

export const wasAlreadySentToday = async (patientId, ruleId, appointmentId = null) => {
  if (!patientId) return false;
  const todayBounds = todayBoundsInPakistan();
  const startOfDay = todayBounds?.start || new Date();

  const query = {
    patientId,
    ruleId,
    status: 'Sent',
    triggeredAt: { $gte: startOfDay },
  };

  if (appointmentId) {
    query.appointmentId = appointmentId;
  }

  const existing = await EngagementLog.findOne(query).lean();
  return Boolean(existing);
};

export const logEngagement = async ({
  patientId,
  ruleId,
  type,
  message,
  status,
  appointmentId = null,
  errorMessage = null,
}) => {
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    console.error('[ENGAGEMENT LOG SKIPPED]: missing patientId', { ruleId, status, message });
    return null;
  }

  try {
    return await EngagementLog.create({
      patientId,
      ruleId,
      type,
      message,
      status,
      appointmentId: appointmentId || null,
      errorMessage,
      triggeredAt: new Date(),
    });
  } catch (err) {
    console.error('[ENGAGEMENT LOG FAILED]:', err.message, { ruleId, status, patientId: String(patientId) });
    return null;
  }
};

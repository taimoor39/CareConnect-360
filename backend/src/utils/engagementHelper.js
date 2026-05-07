import EngagementLog from '../models/EngagementLog.js';
import { todayBoundsInPakistan } from './dateTime.js';

export const wasAlreadySentToday = async (patientId, ruleId, appointmentId = null) => {
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
  try {
    await EngagementLog.create({
      patientId,
      ruleId,
      type,
      message,
      status,
      appointmentId,
      errorMessage,
      triggeredAt: new Date(),
    });
  } catch (err) {
    console.error('[ENGAGEMENT LOG FAILED]:', err.message);
  }
};

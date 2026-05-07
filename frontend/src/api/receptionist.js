import axiosInstance from './client.js';
import { todayPKT } from '../utils/isoDate.js';

export const getReceptionistStats = () => axiosInstance.get('/receptionist/dashboard-stats');

/** @deprecated use getReceptionistStats */
export const getReceptionistDashboardStats = getReceptionistStats;

export const getTodayQueue = (params = {}) =>
  axiosInstance.get('/appointments', {
    params: {
      date: todayPKT(),
      limit: 50,
      sortBy: 'timeSlot',
      sortOrder: 'asc',
      ...params,
    },
  });

export const checkInByQR = (qrCode) => axiosInstance.put('/appointments/checkin', { qrCode });

export const manualCheckIn = (appointmentId) =>
  axiosInstance.put(`/appointments/${appointmentId}/status`, { status: 'Checked-In' });

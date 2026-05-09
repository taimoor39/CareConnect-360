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

// Uploads a QR image (PNG/JPG/WebP) and lets the backend decode + check in.
// Backend returns { success, data: { appointment, decoded } }.
// We let axios detect FormData and auto-set the multipart boundary.
export const checkInByImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return axiosInstance.post('/appointments/checkin/image', form);
};

import axiosInstance from './client.js';

export const getAppointments = (params = {}) => axiosInstance.get('/appointments', { params });

export const getAppointmentStats = () => axiosInstance.get('/appointments/stats');

export const getAppointmentById = (id) => axiosInstance.get(`/appointments/${id}`);

export const createAppointment = (data) => axiosInstance.post('/appointments', data);

export const updateAppointmentStatus = (id, data) => axiosInstance.put(`/appointments/${id}/status`, data);

export const checkInAppointment = (qrCode) => axiosInstance.put('/appointments/checkin', { qrCode });

export const getPatientAppointments = (patientId, params = {}) =>
  axiosInstance.get(`/appointments/patient/${patientId}`, { params });

export const getDoctorAppointments = (doctorId, params = {}) =>
  axiosInstance.get(`/appointments/doctor/${doctorId}`, { params });

export const getDoctorAvailability = (doctorId, date) =>
  axiosInstance.get(`/doctors/${doctorId}/availability`, { params: { date } });

export const searchPatients = (query) =>
  axiosInstance.get('/patients', {
    params: { search: query, limit: 10, status: 'Active' },
  });

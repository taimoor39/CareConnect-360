import axiosInstance from './client.js';

export const getDoctorProfile = () => axiosInstance.get('/doctor/profile');

export const updateDoctorProfile = (data) =>
  axiosInstance.put('/doctor/profile', data);

export const getDoctorDashboardStats = () =>
  axiosInstance.get('/doctor/dashboard-stats');

export const getDoctorSchedule = (params = {}) =>
  axiosInstance.get('/doctor/schedule', { params });

export const getDoctorPatients = (params = {}) =>
  axiosInstance.get('/doctor/patients', { params });

export const getDoctorPatientDetail = (patientId) =>
  axiosInstance.get(`/doctor/patients/${patientId}`);

export const createConsultation = (data) =>
  axiosInstance.post('/doctor/consultations', data);

export const updateConsultation = (id, data) =>
  axiosInstance.put(`/doctor/consultations/${id}`, data);

export const createPrescription = (data) =>
  axiosInstance.post('/doctor/prescriptions', data);

export const getDoctorReports = (params = {}) =>
  axiosInstance.get('/doctor/reports', { params });

export const uploadReport = (data) =>
  axiosInstance.post('/doctor/reports', data);

export const uploadReportPDF = (formData) =>
  axiosInstance.post('/doctor/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const generateAISummary = (reportId) =>
  axiosInstance.post(
    `/doctor/reports/${reportId}/summarize`
  );

export const approveAISummary = (reportId, data) =>
  axiosInstance.put(
    `/doctor/reports/${reportId}/approve-summary`,
    data
  );

export const rejectAISummary = (reportId) =>
  axiosInstance.put(
    `/doctor/reports/${reportId}/reject-summary`
  );


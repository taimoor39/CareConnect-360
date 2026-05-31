import axiosInstance from './client.js';

export const getPatientDashboard = () => axiosInstance.get('/patient/dashboard-stats');

export const getMyAppointments = (params = {}) => axiosInstance.get('/patient/appointments', { params });

export const getMyPrescriptions = (params = {}) => axiosInstance.get('/patient/prescriptions', { params });

export const getMyReports = (params = {}) => axiosInstance.get('/patient/reports', { params });

export const getPatientReportSummary = (reportId) => axiosInstance.get(`/patient/reports/${reportId}/summary`);

export const downloadPatientReportPDF = (reportId) =>
  axiosInstance.get(`/patient/reports/${reportId}/pdf`, { responseType: 'blob' });

export const getMyInvoices = (params = {}) => axiosInstance.get('/patient/invoices', { params });

export const getMyProfile = () => axiosInstance.get('/patient/profile');

export const updateMyProfile = (data) => axiosInstance.put('/patient/profile', data);

export const downloadInvoicePDF = (invoiceId) =>
  axiosInstance.get(`/billing/${invoiceId}/pdf`, { responseType: 'blob' });

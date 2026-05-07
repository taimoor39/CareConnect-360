import axiosInstance from './client.js';

export const getInvoices = (params = {}) => axiosInstance.get('/billing', { params });
export const getBillingStats = () => axiosInstance.get('/billing/stats');
export const getRevenueSummary = () => axiosInstance.get('/billing/revenue-summary');
export const getInvoiceById = (id) => axiosInstance.get(`/billing/${id}`);
export const getInvoiceByAppointment = (appointmentId) => axiosInstance.get(`/billing/appointment/${appointmentId}`);
export const getCompletedAppointments = (params = {}) => axiosInstance.get('/billing/completed-appointments', { params });
export const createInvoice = (data) => axiosInstance.post('/billing', data);
export const updateInvoice = (id, data) => axiosInstance.put(`/billing/${id}`, data);
export const recordPayment = (id, data) => axiosInstance.put(`/billing/${id}/payment`, data);
export const downloadInvoicePDF = (id) =>
  axiosInstance.get(`/billing/${id}/pdf`, { responseType: 'blob' });
export const downloadInvoicePdf = downloadInvoicePDF;
export const getPatientInvoices = (patientId, params = {}) =>
  axiosInstance.get(`/billing/patient/${patientId}`, { params });

import axiosInstance from './client.js';

export const getPortalAccessRequests = (params = {}) =>
  axiosInstance.get('/portal-access', { params });

export const getPortalAccessStats = () =>
  axiosInstance.get('/portal-access/stats');

export const createPortalAccessRequest = (data) =>
  axiosInstance.post('/portal-access', data);

export const approvePortalAccess = (id) =>
  axiosInstance.put(`/portal-access/${id}/approve`);

export const rejectPortalAccess = (id, data) =>
  axiosInstance.put(`/portal-access/${id}/reject`, data);

export const updatePortalRequestEmail = (id, data) =>
  axiosInstance.put(`/portal-access/${id}/update-email`, data);

export const reopenPortalAccess = (id) =>
  axiosInstance.put(`/portal-access/${id}/reopen`);

export const getPatientPortalStatus = (patientId) =>
  axiosInstance.get(`/portal-access/patient/${patientId}`);

export const requestPortalAccess = createPortalAccessRequest;

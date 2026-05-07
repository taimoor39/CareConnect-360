import client from './client.js';

export const getPublicSettings = () => client.get('/settings/public');

export const getSettings = () => client.get('/settings');
export const updateSecuritySettings = (data) => client.put('/settings/security', data);
export const updateEmailSettings = (data) => client.put('/settings/email', data);
export const updateEmailTemplate = (data) => client.put('/settings/email-templates', data);
export const testEmailConnection = () => client.post('/settings/test-email');
export const updateCronJobs = (data) => client.put('/settings/cron-jobs', data);
export const runJobManually = (jobName) => client.post(`/settings/run-job/${jobName}`);
export const updateClinicSettings = (data) => client.put('/settings/clinic', data);
export const uploadClinicLogo = (formData) => client.post('/settings/clinic/logo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateAIService = (data) => client.put('/settings/ai-service', data);
export const checkAIHealth = () => client.get('/settings/ai-health');
export const getMedicalTerms = (params = {}) => client.get('/settings/medical-terms', { params });
export const createMedicalTerm = (data) => client.post('/settings/medical-terms', data);
export const updateMedicalTerm = (id, data) => client.put(`/settings/medical-terms/${id}`, data);
export const deleteMedicalTerm = (id) => client.delete(`/settings/medical-terms/${id}`);
export const changePassword = (data) => client.put('/settings/change-password', data);

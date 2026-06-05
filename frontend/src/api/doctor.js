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

/** Full consultation bundle (notes + prescription + medical report) for one appointment */
export const getAppointmentConsultation = (appointmentId) =>
  axiosInstance.get(`/doctor/appointments/${appointmentId}/consultation`);

/** Upsert full consultation document (notes, prescription, text/PDF medical report) */
export const upsertAppointmentConsultation = (appointmentId, data, reportFile = null) => {
  if (reportFile) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('reportFile', reportFile);
    return axiosInstance.put(`/doctor/appointments/${appointmentId}/consultation`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return axiosInstance.put(`/doctor/appointments/${appointmentId}/consultation`, data);
};

export const createConsultation = (data) =>
  axiosInstance.post('/doctor/consultations', data);

export const updateConsultation = (id, data) =>
  axiosInstance.put(`/doctor/consultations/${id}`, data);

export const getDoctorPrescriptions = (params = {}) =>
  axiosInstance.get('/doctor/prescriptions', { params });

export const saveConsultationPrescription = (data) =>
  axiosInstance.post('/doctor/prescriptions', data);

/** @deprecated use upsertAppointmentConsultation */
export const createPrescription = saveConsultationPrescription;

export const getDoctorReports = (params = {}) =>
  axiosInstance.get('/doctor/reports', { params });

export const uploadConsultationMedicalReportPDF = (appointmentId, formData) =>
  axiosInstance.post(`/doctor/appointments/${appointmentId}/consultation/medical-report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadConsultationMedicalReport = (appointmentId, data) =>
  axiosInstance.post(`/doctor/appointments/${appointmentId}/consultation/medical-report`, data);

/** @deprecated use uploadConsultationMedicalReport* */
export const uploadReport = (data) =>
  axiosInstance.post('/doctor/reports', data);

/** @deprecated use uploadConsultationMedicalReportPDF */
export const uploadReportPDF = (formData) =>
  axiosInstance.post('/doctor/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/** Long-running: backend calls AI service (model load + BART on CPU). */
const AI_SUMMARY_TIMEOUT_MS = 300_000;

/** consultationId = consultation document id */
export const generateAISummary = (consultationId) =>
  axiosInstance.post(`/doctor/consultations/${consultationId}/medical-report/summarize`, null, {
    timeout: AI_SUMMARY_TIMEOUT_MS,
  });

/** Reject existing summary (if any) and run AI summarization again */
export const regenerateAISummary = (consultationId) =>
  axiosInstance.post(`/doctor/consultations/${consultationId}/medical-report/regenerate-summary`, null, {
    timeout: AI_SUMMARY_TIMEOUT_MS,
  });

export const approveAISummary = (consultationId, data) =>
  axiosInstance.put(`/doctor/consultations/${consultationId}/medical-report/approve-summary`, data);

export const rejectAISummary = (consultationId) =>
  axiosInstance.put(`/doctor/consultations/${consultationId}/medical-report/reject-summary`);

/**
 * Replace an existing report's file or text content.
 * Pass `file` (File object) to upload a new PDF, or include `originalText` in
 * `data` to replace with text. Title-only changes (no file / no originalText)
 * preserve the existing summary.
 */
/** Permanently delete the medical report (and AI summary) from a consultation */
export const deleteConsultationReport = (consultationId) =>
  axiosInstance.delete(`/doctor/reports/${consultationId}`);

export const replaceConsultationReport = (consultationId, data, file = null) => {
  if (file) {
    const form = new FormData();
    if (data?.title) form.append('title', data.title);
    form.append('reportFile', file);
    return axiosInstance.put(`/doctor/reports/${consultationId}/replace`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return axiosInstance.put(`/doctor/reports/${consultationId}/replace`, data);
};

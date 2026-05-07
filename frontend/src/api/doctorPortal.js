import axios from 'axios';
import axiosInstance from './client.js';

const aiBase = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

const aiClient = axios.create({
  baseURL: aiBase,
});

export const summarizeMedicalText = (text, config = {}) =>
  aiClient.post('/api/summarize', {
    text,
    max_length: config.maxLength || 150,
    min_length: config.minLength || 50,
  });

export const summarizeMedicalPdf = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return aiClient.post('/api/summarize-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getDoctorAppointmentsAll = (doctorId) => axiosInstance.get(`/appointments/doctor/${doctorId}`);


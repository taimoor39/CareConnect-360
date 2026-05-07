import axiosInstance from './client.js';

export const getPatients = (params = {}) => axiosInstance.get('/patients', { params });

export const getPatientStats = () => axiosInstance.get('/patients/stats');

export const getPatientById = (id) => axiosInstance.get(`/patients/${id}`);

export const createPatient = (data) => axiosInstance.post('/patients', data);

export const updatePatient = (id, data) => axiosInstance.put(`/patients/${id}`, data);

export const archivePatient = (id) => axiosInstance.delete(`/patients/${id}`);


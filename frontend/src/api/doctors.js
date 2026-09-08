import axiosInstance from './client.js';

export const getDoctors = (params = {}) => axiosInstance.get('/doctors', { params });

export const getDoctorById = (id) => axiosInstance.get(`/doctors/${id}`);

export const getDoctorStats = () => axiosInstance.get('/doctors/stats/summary');

export const updateDoctor = (id, data) => axiosInstance.put(`/doctors/${id}`, data);

export const toggleDoctorStatus = (id) => axiosInstance.put(`/doctors/${id}/status`);

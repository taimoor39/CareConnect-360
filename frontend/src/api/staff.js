import axiosInstance from './client.js';

export const getStaff = (params = {}) => axiosInstance.get('/staff', { params });

export const getStaffStats = () => axiosInstance.get('/staff/stats');

export const updateStaff = (id, data) => axiosInstance.put(`/staff/${id}`, data);

export const toggleStaffStatus = (id) => axiosInstance.put(`/staff/${id}/status`);

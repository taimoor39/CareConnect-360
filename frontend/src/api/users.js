import client from './client.js';

export const fetchUsers = (params = {}) => client.get('/users', { params });
export const fetchUserById = (id) => client.get(`/users/${id}`);
export const createUser = (payload) => client.post('/users', payload);
export const updateUser = (id, payload) => client.put(`/users/${id}`, payload);
export const toggleUserStatus = (id, isActive) => client.put(`/users/${id}/status`, { isActive });

export const sendUserResetEmail = (id) => client.post(`/users/${id}/send-reset-email`);

export const setUserTempPassword = (id, temporaryPassword) =>
  client.put(`/users/${id}/set-temp-password`, { temporaryPassword });

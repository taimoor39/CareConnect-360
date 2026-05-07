import client from './client.js';

export const forgotPassword = (email) => client.post('/auth/forgot-password', { email });

export const verifyResetToken = (token) => client.get(`/auth/verify-reset-token/${token}`);

export const resetPassword = (token, payload) => client.post(`/auth/reset-password/${token}`, payload);

export const changeRequiredPassword = (payload) => client.post('/auth/change-required-password', payload);

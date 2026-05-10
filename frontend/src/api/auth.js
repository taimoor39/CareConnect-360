import axios from 'axios';

import client from './client.js';

const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const normalizedBase = apiBase.replace(/\/$/, '');

/** No auth interceptors — used for public registration. */
const publicClient = axios.create({ baseURL: normalizedBase });

export const getAuthMe = () => client.get('/auth/me');

export const registerPatientAccount = (payload) => publicClient.post('/auth/register', payload);

export async function verifyEmailApi(token) {
  const res = await fetch(`${normalizedBase}/auth/verify-email/${encodeURIComponent(token)}`);
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

export const resendVerificationEmail = () => client.post('/auth/resend-verification');

export const forgotPassword = (email) => client.post('/auth/forgot-password', { email });

export const verifyResetToken = (token) => client.get(`/auth/verify-reset-token/${token}`);

export const resetPassword = (token, payload) => client.post(`/auth/reset-password/${token}`, payload);

export const changeRequiredPassword = (payload) => client.post('/auth/change-required-password', payload);

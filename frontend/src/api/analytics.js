import client from './client.js';

export const getAnalyticsSummary = (params = {}) =>
  client.get('/analytics/summary', { params });

export const getAnalyticsOverview = (params = {}) =>
  client.get('/analytics/overview', { params });

export const getAnalyticsPatients = (params = {}) =>
  client.get('/analytics/patients', { params });

export const getAnalyticsAppointments = (params = {}) =>
  client.get('/analytics/appointments', { params });

export const getAnalyticsRevenue = (params = {}) =>
  client.get('/analytics/revenue', { params });

export const getAnalyticsDoctors = (params = {}) =>
  client.get('/analytics/doctors', { params });

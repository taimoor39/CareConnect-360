import client from './client.js';

const sanitizeAuditParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
);

export const getAuditLogs = (params = {}) =>
  client.get('/audit', { params: sanitizeAuditParams(params) });

export const getAuditStats = () =>
  client.get('/audit/stats');

export const getAuditLogById = (id) =>
  client.get(`/audit/${id}`);

export const getAuditActions = () =>
  client.get('/audit/actions');

export const getAuditUsers = () =>
  client.get('/audit/users');

export const exportAuditLogs = (params = {}) =>
  client.get('/audit/export', { params: sanitizeAuditParams(params) });

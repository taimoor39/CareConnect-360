import client from './client.js';

export const getDashboardKPI = () => client.get('/dashboard/kpi-stats');
export const getRevenueChart = (period = '6m') => client.get('/dashboard/revenue-chart', { params: { period } });
/** scope: 'today' (default, aligns with dashboard KPIs) | 'month' */
export const getDashboardAppointmentStats = (scope = 'today') => client.get('/dashboard/appointment-stats', { params: { scope } });
export const getTodaysSchedule = () => client.get('/dashboard/todays-schedule');
export const getRecentPatients = () => client.get('/dashboard/recent-patients');
export const getSystemHealth = () => client.get('/dashboard/system-health');
export const getRecentActivity = () => client.get('/dashboard/recent-activity');
export const getPendingActions = () => client.get('/dashboard/pending-actions');

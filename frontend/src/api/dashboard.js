import client from './client.js';

export const getDashboardKPI = () => client.get('/dashboard/kpi-stats');
export const getDashboardKpiStats = getDashboardKPI;
export const getRevenueChart = (period = '6m') => client.get('/dashboard/revenue-chart', { params: { period } });
export const getDashboardRevenueChart = getRevenueChart;
/** scope: 'today' (default, aligns with dashboard KPIs) | 'month' */
export const getDashboardAppointmentStats = (scope = 'today') => client.get('/dashboard/appointment-stats', { params: { scope } });
export const getTodaysSchedule = () => client.get('/dashboard/todays-schedule');
export const getDashboardTodaySchedule = getTodaysSchedule;
export const getRecentPatients = () => client.get('/dashboard/recent-patients');
export const getDashboardRecentPatients = getRecentPatients;
export const getSystemHealth = () => client.get('/dashboard/system-health');
export const getDashboardSystemHealth = getSystemHealth;
export const getRecentActivity = () => client.get('/dashboard/recent-activity');
export const getDashboardRecentActivity = getRecentActivity;
export const getPendingActions = () => client.get('/dashboard/pending-actions');
export const getDashboardPendingActions = getPendingActions;

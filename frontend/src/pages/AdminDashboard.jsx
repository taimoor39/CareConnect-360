import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'react-toastify';

import DashboardLayout from '../components/DashboardLayout.jsx';
import {
  getAuthMe,
  getDashboardAppointmentStats,
  getDashboardKpiStats,
  getDashboardPendingActions,
  getDashboardRecentActivity,
  getDashboardRecentPatients,
  getDashboardRevenueChart,
  getDashboardSystemHealth,
  getDashboardTodaySchedule,
} from '../api/dashboard.js';
import { formatDateInPakistan } from '../utils/isoDate.js';

const statusDotClass = {
  Scheduled: 'bg-blue-500',
  'Checked-In': 'bg-teal-500',
  'In-Progress': 'bg-amber-400 animate-pulse',
  Completed: 'bg-emerald-500',
  Missed: 'bg-rose-500',
  Cancelled: 'bg-slate-500',
};

const appointmentPieColors = {
  Completed: '#16a34a',
  Scheduled: '#2563eb',
  Missed: '#dc2626',
  Cancelled: '#6b7280',
  'Checked-In': '#0d9488',
  'In-Progress': '#f59e0b',
};

const actionMap = {
  USER_CREATED: { label: 'New user created', color: 'text-emerald-300' },
  DOCTOR_CREATED: { label: 'Doctor account created', color: 'text-sky-300' },
  INVOICE_CREATED: { label: 'Invoice generated', color: 'text-teal-300' },
  APPOINTMENT_CREATED: { label: 'Appointment created', color: 'text-blue-300' },
  ROLE_CHANGED: { label: 'User role changed', color: 'text-amber-300' },
  PATIENT_CHECKED_IN: { label: 'Patient checked in', color: 'text-teal-300' },
  PAYMENT_RECORDED: { label: 'Payment recorded', color: 'text-emerald-300' },
  STAFF_DEACTIVATED: { label: 'Staff deactivated', color: 'text-rose-300' },
};

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`;

const relativeTime = (dateInput) => {
  if (!dateInput) return '--';
  const date = new Date(dateInput);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const greetingByTime = (name) => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 6 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
};

const dateLine = () => formatDateInPakistan(new Date(), 'en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const chartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-slate-200">
      <p className="mb-1 font-semibold text-white">{label}</p>
      <p>Total Invoiced: {money(data.invoiced)}</p>
      <p>Collected: {money(data.collected)}</p>
      <p>Pending: {money(data.pending)}</p>
    </div>
  );
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());
  const [adminName, setAdminName] = useState('Admin');
  const [kpi, setKpi] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentStats, setAppointmentStats] = useState({ breakdown: [], total: 0, completionRate: 0, attendanceRate: 0 });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentPatients, setRecentPatients] = useState({ patients: [], thisWeekCount: 0, thisMonthCount: 0 });
  const [systemHealth, setSystemHealth] = useState({ checks: [], auditToday: 0, totalUsers: 0, collectionsCount: 0, storageNote: '' });
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingActions, setPendingActions] = useState({ unpaidInvoices: 0, missedToday: 0, incompleteProfiles: 0, portalAccessRequests: 0 });

  const fetchDashboard = useCallback(async (chartPeriod = period, showInitialLoader = false) => {
    try {
      if (showInitialLoader) setLoading(true);
      const [
        meResponse,
        kpiResponse,
        revenueResponse,
        appointmentResponse,
        scheduleResponse,
        patientResponse,
        healthResponse,
        activityResponse,
        pendingResponse,
      ] = await Promise.all([
        getAuthMe(),
        getDashboardKpiStats(),
        getDashboardRevenueChart(chartPeriod),
        getDashboardAppointmentStats(),
        getDashboardTodaySchedule(),
        getDashboardRecentPatients(),
        getDashboardSystemHealth(),
        getDashboardRecentActivity(),
        getDashboardPendingActions(),
      ]);

      setAdminName(meResponse.data?.user?.name || 'Admin');
      setKpi(kpiResponse.data?.data || {});
      setRevenueData(revenueResponse.data?.data?.chartData || []);
      setAppointmentStats(appointmentResponse.data?.data || { breakdown: [], total: 0, completionRate: 0, attendanceRate: 0 });
      setTodaySchedule(scheduleResponse.data?.data || []);
      setRecentPatients(patientResponse.data?.data || { patients: [], thisWeekCount: 0, thisMonthCount: 0 });
      setSystemHealth(healthResponse.data?.data || { checks: [] });
      setRecentActivity(activityResponse.data?.data || []);
      setPendingActions(pendingResponse.data?.data || { unpaidInvoices: 0, missedToday: 0, incompleteProfiles: 0, portalAccessRequests: 0 });
      setLastFetchedAt(new Date());
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboard(period, true);
  }, [fetchDashboard, period]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!lastFetchedAt) return;
    const timer = setInterval(() => {
      fetchDashboard(period, false);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchDashboard, lastFetchedAt, period]);

  const pieRows = useMemo(() => {
    const statuses = ['Completed', 'Scheduled', 'Missed', 'Cancelled', 'Checked-In'];
    return statuses.map((status) => ({
      name: status,
      value: Number(appointmentStats.breakdown?.find((row) => row._id === status)?.count || 0),
      color: appointmentPieColors[status],
    }));
  }, [appointmentStats.breakdown]);

  const nowGreeting = greetingByTime(adminName);
  const lastUpdated = lastFetchedAt ? relativeTime(lastFetchedAt) : '--';
  const fullDateLine = `${dateLine()}  |  Last updated: ${lastUpdated}`;

  const healthAttention = (systemHealth.checks || []).some((item) => ['Error', 'Offline', 'Slow', 'Not Configured'].includes(item.status));
  const completionRateTone = appointmentStats.completionRate > 80 ? 'text-emerald-300' : appointmentStats.completionRate >= 50 ? 'text-amber-300' : 'text-rose-300';
  const attendanceRateTone = appointmentStats.attendanceRate > 80 ? 'text-emerald-300' : appointmentStats.attendanceRate >= 50 ? 'text-amber-300' : 'text-rose-300';

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">Loading dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      subtitle="ADMIN PORTAL"
      title={nowGreeting}
      subline={fullDateLine}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: 'TOTAL PATIENTS',
            value: Number(kpi.totalPatients || 0).toLocaleString(),
            color: 'text-white',
            trend: `${kpi.newPatientsThisWeek || 0} new this week`,
            trendColor: (kpi.newPatientsThisWeek || 0) > 0 ? 'text-teal-300' : 'text-slate-400',
            onClick: () => navigate('/patients'),
          },
          {
            label: "TODAY'S APPOINTMENTS",
            value: Number(kpi.todayAppointments || 0).toLocaleString(),
            color: 'text-teal-300',
            trend: `${kpi.todayCompleted || 0} completed, ${kpi.todayRemaining || 0} remaining`,
            trendColor: 'text-slate-300',
            onClick: () => navigate('/appointments?date=today'),
          },
          {
            label: 'ACTIVE DOCTORS',
            value: Number(kpi.activeDoctors || 0).toLocaleString(),
            color: 'text-sky-300',
            trend: `${kpi.completeDoctors || 0} profiles complete`,
            trendColor: 'text-slate-300',
            onClick: () => navigate('/doctors'),
          },
          {
            label: 'REVENUE TODAY',
            value: money(kpi.revenueToday),
            color: 'text-emerald-300',
            trend: `${kpi.revenueDiff >= 0 ? '+' : '-'}${money(Math.abs(kpi.revenueDiff || 0))} vs yesterday`,
            trendColor: (kpi.revenueDiff || 0) >= 0 ? 'text-emerald-300' : 'text-amber-300',
            onClick: () => navigate('/billing'),
          },
          {
            label: 'PENDING INVOICES',
            value: Number(kpi.pendingInvoicesCount || 0).toLocaleString(),
            color: 'text-amber-300',
            trend: `${money(kpi.pendingAmount || 0)} outstanding`,
            trendColor: 'text-amber-300',
            onClick: () => navigate('/billing?status=Unpaid'),
          },
          {
            label: 'MISSED TODAY',
            value: Number(kpi.missedToday || 0).toLocaleString(),
            color: Number(kpi.missedToday || 0) > 0 ? 'text-rose-300' : 'text-emerald-300',
            trend: Number(kpi.missedToday || 0) > 0 ? 'Require follow-up' : 'All patients attended',
            trendColor: Number(kpi.missedToday || 0) > 0 ? 'text-amber-300' : 'text-emerald-300',
            onClick: () => navigate('/appointments?status=Missed'),
          },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="glass-panel rounded-2xl p-5 text-left transition hover:border-teal-300/30 hover:bg-slate-900/80"
          >
            <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{card.value}</p>
            <p className={`mt-1 text-xs ${card.trendColor}`}>{card.trend}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Revenue Overview</h3>
              <p className="text-xs text-slate-400">Last 6 months</p>
            </div>
            <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
              {['6m', '3m', '1m'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded px-2 py-1 text-xs ${period === value ? 'bg-teal-500 text-slate-900' : 'text-slate-300'}`}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip content={chartTooltip} />
                <Legend />
                <Bar dataKey="invoiced" name="Invoiced" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Line dataKey="collected" name="Collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <h3 className="text-base font-semibold text-white">Appointments</h3>
          <p className="text-xs text-slate-400">This month by status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieRows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  {pieRows.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {pieRows.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />{row.name}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-900/70 px-3 py-2">
              Completion Rate: <span className={completionRateTone}>{appointmentStats.completionRate || 0}%</span>
            </div>
            <div className="rounded-md bg-slate-900/70 px-3 py-2">
              Attendance Rate: <span className={attendanceRateTone}>{appointmentStats.attendanceRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Today&apos;s Schedule</h3>
              <p className="text-xs text-slate-400">{dateLine()}</p>
            </div>
            <span className="rounded-full bg-teal-400/15 px-2 py-1 text-xs text-teal-200">{todaySchedule.length} appointments</span>
          </div>
          <div className="space-y-2">
            {todaySchedule.slice(0, 8).map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => navigate(`/appointments?appointmentId=${item._id}`)}
                className="w-full rounded-lg bg-slate-900/70 p-2 text-left hover:bg-slate-800/80"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{item.timeSlot}</span>
                  <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${statusDotClass[item.status] || 'bg-slate-500'}`} />{item.status}</span>
                </div>
                <p className="mt-1 text-sm text-white">{item.patientId?.name || '--'}</p>
                <p className="text-[11px] text-slate-400">Dr. {item.doctorId?.name || '--'} {item.doctorSpecialization ? `- ${item.doctorSpecialization}` : ''}</p>
              </button>
            ))}
            {todaySchedule.length === 0 ? <p className="rounded-lg bg-slate-900/60 p-3 text-xs text-slate-400">No appointments scheduled today</p> : null}
            {todaySchedule.length > 8 ? (
              <button type="button" className="text-xs text-teal-300" onClick={() => navigate('/appointments')}>
                View {todaySchedule.length - 8} more →
              </button>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Recent Patients</h3>
            <button type="button" className="text-xs text-teal-300" onClick={() => navigate('/patients')}>View All →</button>
          </div>
          <div className="space-y-2">
            {(recentPatients.patients || []).map((patient) => (
              <button
                key={patient._id}
                type="button"
                onClick={() => navigate(`/patients?patientId=${patient._id}`)}
                className="flex w-full items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-left hover:bg-slate-800/80"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-xs text-teal-100">
                  {String(patient.name || 'P').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{patient.name || '--'}</p>
                  <p className="truncate text-[11px] text-slate-400">{patient.patientId || patient.patientCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">{relativeTime(patient.createdAt)}</p>
                  {patient.user || patient.userId ? <span className="rounded bg-teal-500/20 px-1 text-[10px] text-teal-200">Has Portal</span> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-900/70 px-2 py-1"><span className="text-teal-300">{recentPatients.thisWeekCount || 0}</span> this week</div>
            <div className="rounded-md bg-slate-900/70 px-2 py-1"><span className="text-teal-300">{recentPatients.thisMonthCount || 0}</span> this month</div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">System Status</h3>
            <span className={`rounded-full px-2 py-1 text-xs ${healthAttention ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
              {healthAttention ? 'Attention Required' : 'All Systems Operational'}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {(systemHealth.checks || []).map((check) => (
              <div key={check.service} className="rounded-md bg-slate-900/70 px-2 py-1">
                <div className="flex items-center justify-between">
                  <span>{check.service}</span>
                  <span>{check.status}</span>
                </div>
                <p className="text-slate-400">{check.responseMs ? `${check.responseMs} ms` : check.lastRun ? `Last ran: ${relativeTime(check.lastRun)}` : '--'}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            <p>Total Users: {systemHealth.totalUsers || 0}</p>
            <p>DB Collections: {systemHealth.collectionsCount || 0}</p>
            <p>Audit Logs Today: {systemHealth.auditToday || 0}</p>
            <p className="text-slate-400">{systemHealth.storageNote || '--'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Recent Activity</h3>
            <button type="button" className="text-xs text-teal-300">View All →</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {recentActivity.map((log) => {
              const meta = actionMap[log.action] || { label: log.action || 'Activity', color: 'text-slate-300' };
              return (
                <div key={log._id} className="rounded-md bg-slate-900/70 p-2 hover:bg-slate-800/75">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${meta.color}`}>{meta.label}</p>
                    <p className="text-[11px] text-slate-400">{relativeTime(log.createdAt)}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">By: {log.userId?.name || 'System'}</p>
                  <p className="text-[11px] text-slate-400">Target: {log.target || '--'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <h3 className="text-base font-semibold text-white">Quick Actions</h3>
          <p className="text-xs text-slate-400">Common tasks</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ['Register Patient', 'Add new record', '/patients'],
              ['Book Appointment', 'Schedule visit', '/appointments'],
              ['Add Doctor / Staff', 'Manage staff', '/doctors'],
              ['Generate Invoice', 'Create billing', '/billing'],
              ['Add User', 'Create account', '/users'],
              ['View Analytics', 'Reports & data', '#charts'],
            ].map(([title, desc, path]) => (
              <button
                key={title}
                type="button"
                onClick={() => (path === '#charts' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate(path))}
                className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left transition hover:border-teal-300/30 hover:bg-slate-800/80"
              >
                <p className="text-xs font-semibold text-teal-200">{title}</p>
                <p className="mt-1 text-[11px] text-slate-400">{desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-xs">
            {pendingActions.unpaidInvoices > 0 ? (
              <button type="button" onClick={() => navigate('/billing?status=Unpaid')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200">
                <span>Invoices unpaid: {pendingActions.unpaidInvoices}</span><span>Review →</span>
              </button>
            ) : null}
            {pendingActions.missedToday > 0 ? (
              <button type="button" onClick={() => navigate('/appointments?status=Missed')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200">
                <span>Missed today: {pendingActions.missedToday}</span><span>View →</span>
              </button>
            ) : null}
            {pendingActions.incompleteProfiles > 0 ? (
              <button type="button" onClick={() => navigate('/doctors')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200">
                <span>Incomplete doctor profiles: {pendingActions.incompleteProfiles}</span><span>Complete →</span>
              </button>
            ) : null}
            {pendingActions.portalAccessRequests > 0 ? (
              <button type="button" onClick={() => navigate('/users?tab=portal-requests')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200">
                <span>Portal requests pending: {pendingActions.portalAccessRequests}</span><span>Review →</span>
              </button>
            ) : null}
            {pendingActions.unpaidInvoices === 0 && pendingActions.missedToday === 0 && pendingActions.incompleteProfiles === 0 && pendingActions.portalAccessRequests === 0 ? (
              <div className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-200">All caught up!</div>
            ) : null}
          </div>
        </div>
      </div>
      <span className="hidden">{clockTick}</span>
    </DashboardLayout>
  );
}

export default AdminDashboard;

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import AppointmentDonut from '../components/dashboard/AppointmentDonut.jsx';
import KPIStatCards from '../components/dashboard/KPIStatCards.jsx';
import PendingAlerts from '../components/dashboard/PendingAlerts.jsx';
import QuickActions from '../components/dashboard/QuickActions.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import RecentPatients from '../components/dashboard/RecentPatients.jsx';
import RevenueChart from '../components/dashboard/RevenueChart.jsx';
import SystemHealth from '../components/dashboard/SystemHealth.jsx';
import TodaySchedule from '../components/dashboard/TodaySchedule.jsx';
import {
  getDashboardAppointmentStats,
  getDashboardKPI,
  getPendingActions,
  getRecentActivity,
  getRecentPatients,
  getRevenueChart,
  getSystemHealth,
  getTodaysSchedule,
} from '../api/dashboard.js';
import { formatDateInPakistan } from '../utils/isoDate.js';
import { adminRefreshMatchesScopes, subscribeAdminRealtime } from '../utils/adminRealtimeClient.js';

const getGreeting = (name) => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
};

function Dashboard() {
  const [kpiStats, setKpiStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [apptStats, setApptStats] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingActions, setPendingActions] = useState({});
  const [chartPeriod, setChartPeriod] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [timeAgo, setTimeAgo] = useState('just now');
  const [lastUpdatedClock, setLastUpdatedClock] = useState('--:--:--');

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('careconnect360_token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setAdminName(decoded.name || 'Admin');
      } catch {
        setAdminName('Admin');
      }
    } else {
      setAdminName('Admin');
    }
  }, []);

  const fetchDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        getDashboardKPI(),
        getRevenueChart(chartPeriod),
        getDashboardAppointmentStats(),
        getTodaysSchedule(),
        getRecentPatients(),
        getSystemHealth(),
        getRecentActivity(),
        getPendingActions(),
      ]);

      const valueOrNull = (index, selector = (v) => v) => (
        results[index].status === 'fulfilled' ? selector(results[index].value) : null
      );

      setKpiStats(valueOrNull(0, (r) => r.data?.data ?? null));
      setRevenueChart(valueOrNull(1, (r) => r.data?.data?.chartData ?? []));
      setApptStats(valueOrNull(2, (r) => r.data?.data ?? null));
      setTodaySchedule(valueOrNull(3, (r) => r.data?.data ?? []));
      setRecentPatients(valueOrNull(4, (r) => r.data?.data ?? {}));
      setSystemHealth(valueOrNull(5, (r) => r.data?.data ?? null));
      setRecentActivity(valueOrNull(6, (r) => r.data?.data ?? []));
      setPendingActions(valueOrNull(7, (r) => r.data?.data ?? {}));
      const now = new Date();
      setLastUpdated(now);
      setLastUpdatedClock(now.toLocaleTimeString('en-GB'));
      if (results.some((item) => item.status === 'rejected')) {
        toast.error('Some dashboard sections failed to load');
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [chartPeriod]);

  const fetchDashboardRef = useRef(fetchDashboard);
  fetchDashboardRef.current = fetchDashboard;

  useEffect(() => {
    return subscribeAdminRealtime((payload) => {
      if (adminRefreshMatchesScopes(payload, ['dashboard'])) {
        fetchDashboardRef.current({ silent: true });
      }
    });
  }, []);

  useEffect(() => {
    fetchDashboard({ silent: false });
  }, [fetchDashboard]);

  useEffect(() => {
    const POLL_MS = 30000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboard({ silent: true });
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    let debounce;
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchDashboard({ silent: true }), 350);
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      clearTimeout(debounce);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [fetchDashboard]);

  useEffect(() => {
    if (!lastUpdated) return;
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diff < 60) setTimeAgo('just now');
      else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        setTimeAgo(`${mins} min${mins > 1 ? 's' : ''} ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600)} hour(s) ago`);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const dateLabel = formatDateInPakistan(new Date(), 'en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <DashboardLayout subtitle="ADMIN PORTAL" title="Loading dashboard..." subline={`${dateLabel}  |  Last updated: just now`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>
          <div className="grid gap-4 xl:grid-cols-5"><div className="skeleton h-[300px] xl:col-span-3" /><div className="skeleton h-[300px] xl:col-span-2" /></div>
          <div className="grid gap-4 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-[350px]" />)}</div>
          <div className="grid gap-4 xl:grid-cols-5"><div className="skeleton h-[300px] xl:col-span-3" /><div className="skeleton h-[300px] xl:col-span-2" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      subtitle="ADMIN PORTAL"
      title={getGreeting(adminName || 'Admin')}
      subline={`${dateLabel}  |  Last updated: ${timeAgo} (${lastUpdatedClock})`}
    >
      <KPIStatCards data={kpiStats} />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3"><RevenueChart data={revenueChart} period={chartPeriod} onChangePeriod={setChartPeriod} /></div>
        <div className="xl:col-span-2"><AppointmentDonut data={apptStats} /></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TodaySchedule data={todaySchedule} />
        <RecentPatients data={recentPatients} />
        <SystemHealth data={systemHealth} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3"><RecentActivity data={recentActivity} /></div>
        <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <QuickActions />
          <PendingAlerts data={pendingActions} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;

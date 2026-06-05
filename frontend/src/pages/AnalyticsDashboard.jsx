import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  getAnalyticsAppointments,
  getAnalyticsDoctors,
  getAnalyticsOverview,
  getAnalyticsPatients,
  getAnalyticsRevenue,
  getAnalyticsSummary,
} from '../api/analytics.js';
import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import { exportToCSV } from '../utils/exportCSV.js';
import { exportAnalyticsPDF } from '../utils/exportPDF.js';
import { formatDate } from '../utils/dateHelpers.js';
import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from '../utils/isoDate.js';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const shortMoney = (value) => {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
};

/** Whole-number ticks for count axes (QA: no 0.25-style fractional ticks). */
const intTick = (v) => String(Math.round(Number(v)));

const STATUS_COLORS = {
  Completed: '#16a34a',
  Scheduled: '#2563eb',
  Missed: '#dc2626',
  Cancelled: '#6b7280',
  'Checked-In': '#0d9488',
  'In-Progress': '#d97706',
};

const TABS = ['Overview', 'Patients', 'Appointments', 'Revenue', 'Doctors'];

const firstOfMonth = () => {
  const d = parseLocalDateFromISO(todayISOInPakistan()) || new Date();
  d.setDate(1);
  return toISOInputValue(d);
};

const datePresetRange = (preset) => {
  const now = parseLocalDateFromISO(todayISOInPakistan()) || new Date();
  const today = toISOInputValue(now);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  if (preset === 'today') return { from: today, to: today };
  if (preset === 'thisWeek') return { from: toISOInputValue(startOfWeek), to: today };
  if (preset === 'thisMonth') return { from: toISOInputValue(startOfMonth), to: today };
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISOInputValue(from), to: toISOInputValue(to) };
  }
  if (preset === 'last3Months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: toISOInputValue(from), to: today };
  }
  if (preset === 'last6Months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return { from: toISOInputValue(from), to: today };
  }
  if (preset === 'thisYear') return { from: toISOInputValue(startOfYear), to: today };
  return { from: firstOfMonth(), to: today };
};

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [dateRange, setDateRange] = useState({ from: firstOfMonth(), to: todayISOInPakistan() });
  const [preset, setPreset] = useState('thisMonth');
  const [summaryStats, setSummaryStats] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [tabData, setTabData] = useState({
    Overview: null,
    Patients: null,
    Appointments: null,
    Revenue: null,
    Doctors: null,
  });
  const [tabLoading, setTabLoading] = useState({
    Overview: false,
    Patients: false,
    Appointments: false,
    Revenue: false,
    Doctors: false,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRangeError, setDateRangeError] = useState('');
  const [apptVolumeGroupBy, setApptVolumeGroupBy] = useState('daily');
  const [revenueTrendGroupBy, setRevenueTrendGroupBy] = useState('daily');
  const [revenueTableView, setRevenueTableView] = useState('month');
  const [doctorSort, setDoctorSort] = useState({ key: 'totalAppts', dir: 'desc' });
  const [appointmentSort, setAppointmentSort] = useState({ key: 'total', dir: 'desc' });
  const datePickerRef = useRef(null);
  const exportMenuRef = useRef(null);
  const loadingTab = tabLoading[activeTab];

  const params = useMemo(() => ({ from: dateRange.from, to: dateRange.to }), [dateRange]);
  const overview = tabData.Overview;
  const patientsData = tabData.Patients;
  const appointmentsData = tabData.Appointments;
  const revenueData = tabData.Revenue;
  const doctorsData = tabData.Doctors;
  const summary = summaryStats;

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getAnalyticsSummary(params);
      setSummaryStats(res.data?.data || null);
    } catch {
      setSummaryStats(null);
      toast.error('Failed to load analytics summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [params]);

  const fetchTabData = useCallback(async (tab) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const fetchers = {
        Overview: () => getAnalyticsOverview(params),
        Patients: () => getAnalyticsPatients(params),
        Appointments: () => getAnalyticsAppointments({ ...params, volumeGroupBy: apptVolumeGroupBy }),
        Revenue: () => getAnalyticsRevenue({ ...params, trendGroupBy: revenueTrendGroupBy, tableView: revenueTableView }),
        Doctors: () => getAnalyticsDoctors(params),
      };
      const res = await fetchers[tab]();
      setTabData((prev) => ({ ...prev, [tab]: res.data?.data || null }));
    } catch {
      setTabData((prev) => ({ ...prev, [tab]: 'error' }));
      toast.error(`Failed to load ${tab.toLowerCase()} analytics`);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [params, apptVolumeGroupBy, revenueTrendGroupBy, revenueTableView]);

  useEffect(() => {
    fetchSummary();
    setTabData({
      Overview: null,
      Patients: null,
      Appointments: null,
      Revenue: null,
      Doctors: null,
    });
  }, [fetchSummary]);

  useEffect(() => {
    if (tabData[activeTab] !== null) return;
    fetchTabData(activeTab);
  }, [activeTab, tabData, fetchTabData]);

  useEffect(() => {
    setTabData((prev) => ({ ...prev, Appointments: null }));
  }, [apptVolumeGroupBy]);

  useEffect(() => {
    setTabData((prev) => ({ ...prev, Revenue: null }));
  }, [revenueTrendGroupBy, revenueTableView]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setDatePickerOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const onTabClick = (tab) => setActiveTab(tab);

  const onPresetChange = (nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') setDateRange(datePresetRange(nextPreset));
  };

  const dateRangeLabel = `${dateRange.from} → ${dateRange.to}`;

  const metricRows = overview
    ? [
      { label: 'Appointment Completion', value: overview.performanceSnapshot?.completionRate || 0 },
      { label: 'Patient Attendance', value: overview.performanceSnapshot?.attendanceRate || 0 },
      { label: 'Invoice Collection', value: overview.performanceSnapshot?.invoiceCollectionRate || 0 },
      { label: 'Doctor Availability', value: overview.performanceSnapshot?.doctorAvailability || 0 },
      { label: 'Patient Growth', value: overview.performanceSnapshot?.patientGrowthRate || 0 },
    ]
    : [];

  const buildExportPayload = () => {
    if (activeTab === 'Overview' && overview) {
      return {
        title: 'Overview Analytics Report',
        subtitle: 'Cross-module operational overview',
        tableHeaders: ['Period', 'New Patients', 'Appointments', 'Invoices', 'Revenue'],
        tableData: (overview.activityOverTime || []).map((r) => [r.bucket, r.patients, r.appointments, r.invoices, money(r.revenue)]),
        csvData: (overview.activityOverTime || []).map((r) => ({
          period: r.bucket, newPatients: r.patients, appointments: r.appointments, invoices: r.invoices, revenue: r.revenue,
        })),
      };
    }
    if (activeTab === 'Patients' && patientsData) {
      return {
        title: 'Patient Analytics Report',
        subtitle: 'Patient registration and demographics data',
        tableHeaders: ['Month', 'New Patients', 'Cumulative', 'Growth %', 'Active', 'Inactive'],
        tableData: (patientsData.table?.rows || []).map((row) => [row.period, row.newPatients, row.cumulative, pct(row.growthPct), row.active, row.inactive]),
        csvData: (patientsData.table?.rows || []).map((row) => ({
          month: row.period, newPatients: row.newPatients, cumulative: row.cumulative, growthPercent: row.growthPct, active: row.active, inactive: row.inactive,
        })),
      };
    }
    if (activeTab === 'Appointments' && appointmentsData) {
      return {
        title: 'Appointment Analytics Report',
        subtitle: 'Appointment volume and doctor summary',
        tableHeaders: ['Doctor', 'Specialization', 'Total', 'Completed', 'Missed', 'Cancelled', 'Completion%', 'Avg/Day'],
        tableData: (appointmentsData.doctorSummary?.rows || []).map((row) => [row.doctor, row.specialization, row.total, row.completed, row.missed, row.cancelled, pct(row.completionPct), row.avgPerDay]),
        csvData: appointmentsData.doctorSummary?.rows || [],
      };
    }
    if (activeTab === 'Revenue' && revenueData) {
      const tableHeaders = revenueTableView === 'doctor'
        ? ['Doctor', 'Specialization', 'Consultations', 'Revenue Generated', 'Avg/Consultation']
        : revenueTableView === 'patient'
          ? ['Patient', 'Code', 'Visits', 'Total Spent', 'Last Visit']
          : ['Month', 'Invoices', 'Invoiced', 'Collected', 'Outstanding', 'Collection Rate', 'vs Prev Month'];
      const tableData = revenueTableView === 'doctor'
        ? (revenueData.table || []).map((r) => [r.doctor, r.specialization, r.consultations, money(r.revenueGenerated), money(r.avgPerConsultation)])
        : revenueTableView === 'patient'
          ? (revenueData.table || []).map((r) => [r.patient, r.code, r.visits, money(r.totalSpent), r.lastVisit ? formatDate(r.lastVisit) : '-'])
          : (revenueData.table || []).map((r) => [r.month, r.invoices, money(r.invoiced), money(r.collected), money(r.outstanding), pct(r.collectionRate), pct(r.vsPrevMonth)]);
      return {
        title: 'Revenue Analytics Report',
        subtitle: 'Revenue trends and collection performance',
        tableHeaders,
        tableData,
        csvData: revenueData.table || [],
      };
    }
    if (activeTab === 'Doctors' && doctorsData) {
      return {
        title: 'Doctor Analytics Report',
        subtitle: 'Doctor performance summary',
        tableHeaders: ['Rank', 'Doctor', 'Specialization', 'Total', 'Completed', 'Missed', 'Cancelled', 'Completion%', 'Avg/Day', 'Revenue'],
        tableData: (doctorsData.table || []).map((r) => [r.medal || r.rank, r.doctor, r.specialization, r.totalAppts, r.completed, r.missed, r.cancelled, pct(r.completionPct), r.avgPatientsPerDay, money(r.revenueGenerated)]),
        csvData: doctorsData.table || [],
      };
    }
    return null;
  };

  const handleExportCSV = () => {
    const payload = buildExportPayload();
    if (!payload) return toast.warning('No data to export');
    exportToCSV(payload.csvData, `analytics-${activeTab.toLowerCase()}-${dateRange.from}-to-${dateRange.to}`);
    setExportOpen(false);
  };

  const handleExportPDF = () => {
    const payload = buildExportPayload();
    if (!payload) return toast.warning('No data to export');
    exportAnalyticsPDF({
      ...payload,
      dateRange,
      summaryStats: [
        { label: 'Total Patients', value: summary?.totalPatients?.value ?? 0 },
        { label: 'Appointments', value: summary?.appointments?.value ?? 0 },
        { label: 'Revenue', value: money(summary?.revenue?.value || 0) },
      ],
    });
    setExportOpen(false);
  };

  const cards = [
    { key: 'totalPatients', label: 'TOTAL PATIENTS', color: 'border-l-sky-400', clickTab: 'Patients', value: summary?.totalPatients?.value, trend: summary?.totalPatients?.trend },
    { key: 'appointments', label: 'APPOINTMENTS', color: 'border-l-teal-400', clickTab: 'Appointments', value: summary?.appointments?.value, trend: summary?.appointments?.trend },
    { key: 'revenue', label: 'REVENUE', color: 'border-l-emerald-400', clickTab: 'Revenue', value: money(summary?.revenue?.value || 0), trend: summary?.revenue?.trend },
    { key: 'completionRate', label: 'COMPLETION RATE', color: 'border-l-amber-400', clickTab: 'Appointments', value: pct(summary?.completionRate?.value || 0), trend: summary?.completionRate?.trend },
    { key: 'outstanding', label: 'OUTSTANDING', color: 'border-l-rose-400', clickTab: 'Revenue', value: money(summary?.outstanding?.value || 0), trend: summary?.outstanding?.trend },
  ];

  const renderOverview = () => {
    if (loadingTab) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Loading overview analytics...</div>;
    if (!overview || overview === 'error') return <div className="glass-panel rounded-2xl p-5 text-sm text-rose-300">Overview data unavailable</div>;
    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
            <h3 className="text-base font-semibold text-white">Activity Over Time</h3>
            <p className="text-xs text-slate-400">Patients, appointments and invoices over selected period</p>
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={overview.activityOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={intTick} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10 }}
                    formatter={(value, name) => [name === 'revenue' ? money(value) : intTick(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="right" dataKey="revenue" fill="#16a34a66" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="patients" stroke="#14b8a6" strokeWidth={2.2} dot={{ r: 2 }} name="New Patients" />
                  <Line yAxisId="left" type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2.2} dot={{ r: 2 }} name="Appointments" />
                  <Line yAxisId="left" type="monotone" dataKey="invoices" stroke="#22c55e" strokeWidth={2.2} dot={{ r: 2 }} name="Invoices Generated" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-white">Performance Snapshot</h3>
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={metricRows.map((m) => ({ metric: m.label, value: Math.round(Number(m.value || 0)) }))}
                  outerRadius="70%"
                >
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={intTick} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10 }} formatter={(value) => [`${intTick(value)}%`, 'Score']} />
                  <Radar dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {metricRows.map((metric) => (
                <div key={metric.label} className="text-xs">
                  <div className="mb-1 flex items-center justify-between text-slate-300">
                    <span>{metric.label}</span>
                    <span>{pct(metric.value)}</span>
                  </div>
                  <div className="h-2 w-full rounded bg-slate-800">
                    <div className="h-full rounded bg-teal-400" style={{ width: `${Math.max(4, Math.min(100, metric.value))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white">Appointment Status Breakdown</h3>
            <div className="relative mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(overview.appointmentStatusBreakdown || []).map((x) => ({ name: x.status, value: x.count }))} innerRadius={55} outerRadius={82} dataKey="value">
                    {(overview.appointmentStatusBreakdown || []).map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#64748b'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-semibold text-white">{overview.totals?.appointments || 0}</p>
                  <p className="text-[11px] text-slate-400">Total</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white">Revenue Split</h3>
            <div className="relative mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(overview.revenueSplit || []).map((x) => ({ name: x.status, value: x.amount }))} innerRadius={55} outerRadius={82} dataKey="value">
                    {(overview.revenueSplit || []).map((s) => <Cell key={s.status} fill={s.status === 'Paid' ? '#16a34a' : s.status === 'Partial' ? '#d97706' : '#dc2626'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10 }} formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{money(overview.totals?.invoicedAmount || 0)}</p>
                  <p className="text-[11px] text-slate-400">Invoiced</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white">Top 5 Specializations by Appointments</h3>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={overview.topSpecializations || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={intTick} />
                  <YAxis dataKey="specialization" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10 }} />
                  <Bar dataKey="appointments" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sortRows = (rows, sort) => [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
    return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const toggleSort = (setter, current, key) => {
    setter({ key, dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc' });
  };

  const chartTooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 10 };

  const renderPatientsTab = () => {
    if (loadingTab) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Loading patients analytics...</div>;
    if (!patientsData || patientsData === 'error') return <div className="glass-panel rounded-2xl p-5 text-sm text-rose-300">Patients analytics unavailable</div>;
    const totalRow = patientsData.table?.total || {};
    const genderRows = patientsData.demographics?.gender || [];
    const genderTotal = genderRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const renderGenderTooltip = ({ active, payload }) => {
      if (!active || !payload?.length) return null;
      const entry = payload[0];
      const name = entry.name ?? entry.payload?.name ?? '—';
      const count = Number(entry.value ?? entry.payload?.count ?? 0);
      const share = genderTotal > 0 ? ((count / genderTotal) * 100).toFixed(1) : '0.0';
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs shadow-lg">
          <p className="font-medium text-slate-100">{name}</p>
          <p className="mt-0.5 text-teal-300">
            {intTick(count)} patients ({share}%)
          </p>
        </div>
      );
    };
    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
            <h3 className="text-base font-semibold text-white">Patient Registration Growth</h3>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={patientsData.chart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={intTick} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={intTick} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Area yAxisId="left" type="monotone" dataKey="cumulative" stroke="#14b8a6" fill="#14b8a633" name="Cumulative Total" />
                  <Bar yAxisId="right" dataKey="newPatients" fill="#14b8a666" name="New Registrations" />
                  <Line yAxisId="right" type="monotone" dataKey="newPatients" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} name="New Registrations" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-4 xl:col-span-2">
            <div className="glass-panel rounded-2xl p-4">
              <h4 className="text-sm font-medium text-white">Gender Distribution</h4>
              <div className="relative h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderRows} dataKey="count" nameKey="name" innerRadius={45} outerRadius={65} stroke="#0f172a" strokeWidth={1}>
                      {genderRows.map((row) => (
                        <Cell key={row.name} fill={row.name === 'Male' ? '#3b82f6' : row.name === 'Female' ? '#ec4899' : '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={renderGenderTooltip} wrapperStyle={{ zIndex: 30 }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-300">
                  Gender
                </p>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <h4 className="text-sm font-medium text-white">Blood Group Distribution</h4>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientsData.demographics?.bloodGroups || []}>
                    <XAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={false}
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: '#14b8a6' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value) => [intTick(value), 'Patients']}
                    />
                    <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white">Patient Registration Details</h3>
          <p className="text-xs text-slate-400">Monthly breakdown within selected period</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="text-slate-400">
                <tr>
                  {['Month', 'New Patients', 'Cumulative', 'Growth %', 'Active', 'Inactive'].map((h) => <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(patientsData.table?.rows || []).map((row) => (
                  <tr key={row.period} className="border-t border-slate-800/70">
                    <td className="px-2 py-2">{row.period}</td>
                    <td className="px-2 py-2">{row.newPatients}</td>
                    <td className="px-2 py-2">{row.cumulative}</td>
                    <td className="px-2 py-2">{pct(row.growthPct)}</td>
                    <td className="px-2 py-2">{row.active}</td>
                    <td className="px-2 py-2">{row.inactive}</td>
                  </tr>
                ))}
                <tr className="border-t border-teal-500/30 bg-teal-500/10 font-semibold text-teal-100">
                  <td className="px-2 py-2">{totalRow.period || 'TOTAL'}</td>
                  <td className="px-2 py-2">{totalRow.newPatients || 0}</td>
                  <td className="px-2 py-2">{totalRow.cumulative || 0}</td>
                  <td className="px-2 py-2">{pct(totalRow.growthPct || 0)}</td>
                  <td className="px-2 py-2">{totalRow.active || 0}</td>
                  <td className="px-2 py-2">{totalRow.inactive || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Peak Registration Month</p>
            <p className="mt-2 text-xl font-semibold text-white">{patientsData.insights?.peakRegistrationMonth?.period || '-'}</p>
            <p className="text-xs text-slate-300">{patientsData.insights?.peakRegistrationMonth?.newPatients || 0} new patients</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Average Monthly Growth</p>
            <p className="mt-2 text-xl font-semibold text-teal-200">{pct(patientsData.insights?.averageMonthlyGrowth || 0)}</p>
            <p className="text-xs text-slate-300">across selected period</p>
          </div>
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    const data = appointmentsData?.heatmap;
    if (!data) return null;
    const cellW = 36;
    const cellH = 22;
    const xOffset = 54;
    const yOffset = 22;
    const width = xOffset + (data.hours?.length || 0) * cellW + 20;
    const height = yOffset + (data.days?.length || 0) * cellH + 20;
    const cells = data.rows || [];
    const max = Math.max(1, data.max || 1);
    const intensity = (v) => 0.15 + (v / max) * 0.75;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {(data.hours || []).map((h, i) => (
          <text key={h} x={xOffset + i * cellW + 8} y={16} fill="#94a3b8" fontSize="10">{h}</text>
        ))}
        {(data.days || []).map((d, i) => (
          <text key={d} x={6} y={yOffset + i * cellH + 14} fill="#94a3b8" fontSize="10">{d}</text>
        ))}
        {cells.map((c) => {
          const xi = (data.hours || []).indexOf(c.hour);
          const yi = (data.days || []).indexOf(c.day);
          if (xi < 0 || yi < 0) return null;
          return (
            <g key={`${c.day}-${c.hour}`}>
              <rect x={xOffset + xi * cellW} y={yOffset + yi * cellH} width={cellW - 2} height={cellH - 2} fill="#14b8a6" opacity={intensity(c.count)} rx="2" />
              <title>{`${c.day} ${c.hourLabel}: ${c.count} appointments`}</title>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderAppointmentsTab = () => {
    if (loadingTab) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Loading appointment analytics...</div>;
    if (!appointmentsData || appointmentsData === 'error') return <div className="glass-panel rounded-2xl p-5 text-sm text-rose-300">Appointment analytics unavailable</div>;
    const total = Math.max(1, appointmentsData.stats?.total || 1);
    const doctorRows = sortRows(appointmentsData.doctorSummary?.rows || [], appointmentSort);
    const totals = appointmentsData.doctorSummary?.totals || {};
    return (
      <div className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          {[
            { label: 'Scheduled', key: 'scheduled', color: 'border-l-blue-400' },
            { label: 'Completed', key: 'completed', color: 'border-l-emerald-400' },
            { label: 'Missed', key: 'missed', color: 'border-l-rose-400' },
            { label: 'Cancelled', key: 'cancelled', color: 'border-l-slate-400' },
          ].map((card) => (
            <div key={card.key} className={`glass-panel rounded-xl border-l-4 ${card.color} px-3 py-2`}>
              <p className="text-[11px] text-slate-400">{card.label}</p>
              <p className="text-lg font-semibold text-white">{appointmentsData.stats?.[card.key] || 0}</p>
              <p className="text-[11px] text-slate-400">{pct(((appointmentsData.stats?.[card.key] || 0) / total) * 100)} of total</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Appointment Volume Over Time</h3>
              <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
                {['daily', 'weekly', 'monthly'].map((v) => (
                  <button key={v} type="button" onClick={() => setApptVolumeGroupBy(v)} className={`rounded px-2 py-1 text-xs ${apptVolumeGroupBy === v ? 'bg-teal-500 text-slate-900' : 'text-slate-300'}`}>{v[0].toUpperCase() + v.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsData.volume || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={intTick} />
                  <Tooltip
                    cursor={false}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#14b8a6" name="Completed" />
                  <Bar dataKey="missed" fill="#dc2626" name="Missed" />
                  <Bar dataKey="cancelled" fill="#64748b" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-white">Daily Pattern Heatmap</h3>
            {renderHeatmap()}
            <p className="mt-2 text-xs text-slate-400">Low ░░▒▓█ High</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white">Appointment Summary by Doctor</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="text-slate-400">
                <tr>
                  {[
                    ['Doctor', 'doctor'],
                    ['Specialization', 'specialization'],
                    ['Total', 'total'],
                    ['Completed', 'completed'],
                    ['Missed', 'missed'],
                    ['Cancelled', 'cancelled'],
                    ['Completion%', 'completionPct'],
                    ['Avg/Day', 'avgPerDay'],
                  ].map(([h, key]) => (
                    <th key={h} className="cursor-pointer px-2 py-2 text-left font-medium" onClick={() => toggleSort(setAppointmentSort, appointmentSort, key)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctorRows.map((row) => (
                  <tr key={`${row.doctor}-${row.specialization}`} className="border-t border-slate-800/70">
                    <td className="px-2 py-2">{row.doctor}</td>
                    <td className="px-2 py-2">{row.specialization}</td>
                    <td className="px-2 py-2">{row.total}</td>
                    <td className="px-2 py-2">{row.completed}</td>
                    <td className="px-2 py-2">{row.missed}</td>
                    <td className="px-2 py-2">{row.cancelled}</td>
                    <td className={`px-2 py-2 ${row.completionPct > 80 ? 'text-emerald-300' : row.completionPct >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>{pct(row.completionPct)}</td>
                    <td className="px-2 py-2">{row.avgPerDay}</td>
                  </tr>
                ))}
                <tr className="border-t border-teal-500/30 bg-teal-500/10 font-semibold text-teal-100">
                  <td className="px-2 py-2">TOTALS</td>
                  <td className="px-2 py-2">-</td>
                  <td className="px-2 py-2">{totals.total || 0}</td>
                  <td className="px-2 py-2">{totals.completed || 0}</td>
                  <td className="px-2 py-2">{totals.missed || 0}</td>
                  <td className="px-2 py-2">{totals.cancelled || 0}</td>
                  <td className="px-2 py-2">{pct(totals.completionPct || 0)}</td>
                  <td className="px-2 py-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const gaugePath = (cx, cy, r, startDeg, endDeg) => {
    const rad = (deg) => (Math.PI / 180) * deg;
    const x1 = cx + r * Math.cos(rad(startDeg));
    const y1 = cy + r * Math.sin(rad(startDeg));
    const x2 = cx + r * Math.cos(rad(endDeg));
    const y2 = cy + r * Math.sin(rad(endDeg));
    const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const renderRevenueTab = () => {
    if (loadingTab) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Loading revenue analytics...</div>;
    if (!revenueData || revenueData === 'error') return <div className="glass-panel rounded-2xl p-5 text-sm text-rose-300">Revenue analytics unavailable</div>;

    const rate = Number(revenueData.insights?.collectionEfficiency || 0);
    const gaugeColor = rate > 85 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626';
    const end = -180 + (Math.min(100, Math.max(0, rate)) / 100) * 180;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="glass-panel rounded-xl px-3 py-2"><p className="text-[11px] text-slate-400">TOTAL INVOICED</p><p className="text-lg font-semibold text-white">{money(revenueData.stats?.totalInvoiced)}</p></div>
          <div className="glass-panel rounded-xl px-3 py-2"><p className="text-[11px] text-slate-400">TOTAL COLLECTED</p><p className="text-lg font-semibold text-emerald-200">{money(revenueData.stats?.totalCollected)}</p></div>
          <div className="glass-panel rounded-xl px-3 py-2"><p className="text-[11px] text-slate-400">OUTSTANDING</p><p className="text-lg font-semibold text-amber-200">{money(revenueData.stats?.outstanding)}</p></div>
          <div className="glass-panel rounded-xl px-3 py-2"><p className="text-[11px] text-slate-400">AVG PER VISIT</p><p className="text-lg font-semibold text-teal-200">{money(revenueData.stats?.avgPerVisit)}</p></div>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Revenue Trend</h3>
              <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
                {['daily', 'monthly'].map((v) => (
                  <button key={v} type="button" onClick={() => setRevenueTrendGroupBy(v)} className={`rounded px-2 py-1 text-xs ${revenueTrendGroupBy === v ? 'bg-teal-500 text-slate-900' : 'text-slate-300'}`}>{v[0].toUpperCase() + v.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueData.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} tickFormatter={(v) => shortMoney(Math.round(Number(v)))} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="invoiced" fill="#14b8a666" name="Invoiced" />
                  <Line type="monotone" dataKey="collected" stroke="#16a34a" strokeWidth={2} name="Collected" />
                  <Line type="monotone" dataKey="outstanding" stroke="#d97706" strokeDasharray="6 4" strokeWidth={2} name="Outstanding" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-white">Payment Method Distribution</h3>
            <div className="mt-3 space-y-2">
              {(revenueData.paymentMethods || []).map((row) => (
                <div key={row.method}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-200">{row.method}</span>
                    <span className="text-teal-200">{money(row.amount)} ({pct(row.pct)})</span>
                  </div>
                  <div className="h-2 rounded bg-slate-800">
                    <div className="h-full rounded bg-teal-500" style={{ width: `${Math.min(100, row.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-300">Total collected: {money(revenueData.stats?.totalCollected)}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Revenue Breakdown</h3>
            <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
              {[
                ['month', 'By Month'],
                ['doctor', 'By Doctor'],
                ['patient', 'By Patient'],
              ].map(([v, label]) => (
                <button key={v} type="button" onClick={() => setRevenueTableView(v)} className={`rounded px-2 py-1 text-xs ${revenueTableView === v ? 'bg-teal-500 text-slate-900' : 'text-slate-300'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="text-slate-400">
                <tr>
                  {revenueTableView === 'month' ? (
                    ['Month', 'Invoices', 'Total Invoiced', 'Collected', 'Outstanding', 'Collection Rate', 'vs Prev Month'].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)
                  ) : revenueTableView === 'doctor' ? (
                    ['Doctor', 'Specialization', 'Consultations', 'Revenue Generated', 'Avg Per Consultation'].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)
                  ) : (
                    ['Patient', 'Code', 'Visits', 'Total Spent', 'Last Visit'].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)
                  )}
                </tr>
              </thead>
              <tbody>
                {(revenueData.table || []).map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-800/70">
                    {revenueTableView === 'month' ? (
                      <>
                        <td className="px-2 py-2">{row.month}</td>
                        <td className="px-2 py-2">{row.invoices}</td>
                        <td className="px-2 py-2">{money(row.invoiced)}</td>
                        <td className="px-2 py-2">{money(row.collected)}</td>
                        <td className="px-2 py-2">{money(row.outstanding)}</td>
                        <td className="px-2 py-2">{pct(row.collectionRate)}</td>
                        <td className="px-2 py-2">{pct(row.vsPrevMonth)}</td>
                      </>
                    ) : revenueTableView === 'doctor' ? (
                      <>
                        <td className="px-2 py-2">{row.doctor}</td>
                        <td className="px-2 py-2">{row.specialization}</td>
                        <td className="px-2 py-2">{row.consultations}</td>
                        <td className="px-2 py-2">{money(row.revenueGenerated)}</td>
                        <td className="px-2 py-2">{money(row.avgPerConsultation)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2">{row.patient}</td>
                        <td className="px-2 py-2">{row.code}</td>
                        <td className="px-2 py-2">{row.visits}</td>
                        <td className="px-2 py-2">{money(row.totalSpent)}</td>
                        <td className="px-2 py-2">{row.lastVisit ? formatDate(row.lastVisit) : '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Best Performing Month</p>
            <p className="mt-2 text-xl font-semibold text-white">{revenueData.insights?.bestPerformingMonth?.month || '-'}</p>
            <p className="text-xs text-slate-300">{money(revenueData.insights?.bestPerformingMonth?.amount || 0)}</p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Collection Efficiency</p>
            <svg viewBox="0 0 220 140" className="mt-2 h-[130px] w-full">
              <path d={gaugePath(110, 110, 78, -180, 0)} fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
              <path d={gaugePath(110, 110, 78, -180, end)} fill="none" stroke={gaugeColor} strokeWidth="14" strokeLinecap="round" />
              <text x="110" y="100" textAnchor="middle" fill="#e2e8f0" fontSize="20" fontWeight="600">{pct(rate)}</text>
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const renderDoctorsTab = () => {
    if (loadingTab) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Loading doctors analytics...</div>;
    if (!doctorsData || doctorsData === 'error') return <div className="glass-panel rounded-2xl p-5 text-sm text-rose-300">Doctors analytics unavailable</div>;
    const sortedTable = sortRows(doctorsData.table || [], doctorSort);
    const renderConsultationVolumeTooltip = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      const count = Number(payload[0]?.value ?? payload[0]?.payload?.consultations ?? 0);
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs shadow-lg">
          <p className="font-medium text-slate-100">{label}</p>
          <p className="mt-0.5 text-teal-300">{intTick(count)} consultations</p>
        </div>
      );
    };
    return (
      <div className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {(doctorsData.cards || []).slice(0, 6).map((doc, idx) => (
            <div key={doc.doctorId} className={`glass-panel rounded-2xl p-4 ${idx === 0 ? 'border-t-2 border-amber-300/70' : ''}`}>
              {idx === 0 ? <div className="mb-2 inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">Top Performer</div> : null}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-teal-200">
                  {String(doc.doctor).split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{doc.doctor}</p>
                  <p className="text-[11px] text-teal-300">{doc.specialization}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>Consultations: <span className="text-slate-200">{doc.totalAppts}</span></div>
                <div>Completion: <span className="text-slate-200">{pct(doc.completionPct)}</span></div>
                <div>Avg Rating: <span className="text-slate-200">★★★★☆</span></div>
                <div>Missed: <span className="text-slate-200">{doc.missed}</span></div>
              </div>
              <div className="mt-2 h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={doc.sparkline || []}>
                    <Line dataKey="count" stroke="#14b8a6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className={`text-[11px] ${doc.status === 'Active' ? 'text-emerald-300' : 'text-slate-400'}`}>● {doc.status}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <div className="glass-panel rounded-2xl p-5 xl:col-span-3">
            <h3 className="text-base font-semibold text-white">Doctor Consultation Volume</h3>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorsData.consultationVolume || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} tickFormatter={intTick} />
                  <YAxis type="category" dataKey="doctor" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={renderConsultationVolumeTooltip} cursor={false} wrapperStyle={{ zIndex: 30 }} />
                  <Bar
                    dataKey="consultations"
                    name="Consultations"
                    radius={[0, 4, 4, 0]}
                  >
                    {(doctorsData.consultationVolume || []).map((d) => (
                      <Cell key={d.doctor} fill={d.completionPct > 80 ? '#14b8a6' : d.completionPct >= 50 ? '#d97706' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-white">Workload Distribution</h3>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorsData.workloadDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="doctor" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} tickFormatter={intTick} />
                  <Tooltip
                    cursor={false}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#16a34a" name="Completed" />
                  <Bar dataKey="missed" stackId="a" fill="#dc2626" name="Missed" />
                  <Bar dataKey="cancelled" stackId="a" fill="#64748b" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white">Doctor Performance Summary</h3>
          <p className="text-xs text-slate-400">Within selected date range</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="text-slate-400">
                <tr>
                  {[
                    ['Rank', 'rank'],
                    ['Doctor', 'doctor'],
                    ['Specialization', 'specialization'],
                    ['Total Appts', 'totalAppts'],
                    ['Completed', 'completed'],
                    ['Missed', 'missed'],
                    ['Cancelled', 'cancelled'],
                    ['Completion%', 'completionPct'],
                    ['Avg Patients/Day', 'avgPatientsPerDay'],
                    ['Revenue Generated', 'revenueGenerated'],
                  ].map(([h, key]) => (
                    <th key={h} className="cursor-pointer px-2 py-2 text-left font-medium" onClick={() => toggleSort(setDoctorSort, doctorSort, key)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTable.map((row) => (
                  <tr key={row.doctorId} className={`border-t border-slate-800/70 ${row.rank === 1 ? 'bg-amber-300/10' : ''}`}>
                    <td className="px-2 py-2">{row.medal || row.rank}</td>
                    <td className="px-2 py-2">{row.doctor}</td>
                    <td className="px-2 py-2">{row.specialization}</td>
                    <td className="px-2 py-2">{row.totalAppts}</td>
                    <td className="px-2 py-2">{row.completed}</td>
                    <td className="px-2 py-2">{row.missed}</td>
                    <td className="px-2 py-2">{row.cancelled}</td>
                    <td className={`px-2 py-2 ${row.completionPct > 80 ? 'text-emerald-300' : row.completionPct >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>{pct(row.completionPct)}</td>
                    <td className="px-2 py-2">{row.avgPatientsPerDay}</td>
                    <td className="px-2 py-2">{money(row.revenueGenerated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Analytics & Reports"
      subtitle="ADMIN PORTAL"
      headerActions={(
        <div className="flex flex-wrap items-center gap-2">
          <div ref={datePickerRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setDatePickerOpen((v) => !v);
                setExportOpen(false);
              }}
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-teal-400/60"
            >
              <span className="text-slate-400">Date Range</span>
              <span>{dateRangeLabel}</span>
              <span>▼</span>
            </button>
            {datePickerOpen ? (
              <div className="absolute right-0 z-30 mt-1 w-[330px] rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">From</label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => {
                        setPreset('custom');
                        const next = { ...dateRange, from: e.target.value };
                        setDateRange(next);
                        setDateRangeError(next.from && next.to && next.from > next.to ? '"From" must be before "To"' : '');
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">To</label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => {
                        setPreset('custom');
                        const next = { ...dateRange, to: e.target.value };
                        setDateRange(next);
                        setDateRangeError(next.from && next.to && next.from > next.to ? '"From" must be before "To"' : '');
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-teal-400"
                    />
                    {dateRangeError ? <p className="mt-1 text-[11px] text-rose-300">{dateRangeError}</p> : null}
                  </div>
                </div>
                <label className="mb-1 mt-3 block text-[11px] text-slate-400">Preset</label>
                <select
                  value={preset}
                  onChange={(e) => onPresetChange(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-teal-400"
                >
                  <option value="today">Today</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="last3Months">Last 3 Months</option>
                  <option value="last6Months">Last 6 Months</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom</option>
                </select>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setExportOpen((v) => !v);
                setDatePickerOpen(false);
              }}
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/20"
            >
              Export Report
              <span>▼</span>
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl">
                <button type="button" onClick={handleExportPDF} className="w-full rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">Export as PDF</button>
                <button type="button" onClick={handleExportCSV} className="w-full rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">Export as CSV</button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    >
      <div className="grid gap-3 xl:grid-cols-5">
        {cards.map((card) => {
          const trend = Number(card.trend || 0);
          const goodForOutstanding = card.key === 'outstanding' ? trend < 0 : trend >= 0;
          const trendColor = goodForOutstanding ? 'text-emerald-300' : 'text-rose-300';
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onTabClick(card.clickTab)}
              className={`glass-panel min-h-[5.25rem] rounded-xl border-l-4 ${card.color} px-3 py-2 text-left`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-400">{card.label}</p>
                <span className={`rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] ${trendColor}`}>
                  {summaryLoading ? '...' : `${trend >= 0 ? '+' : ''}${pct(trend)}`}
                </span>
              </div>
              <p className="mt-2 text-lg font-medium text-slate-100">{summaryLoading ? '—' : card.value}</p>
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-2xl p-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabClick(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' && renderOverview()}
      {activeTab === 'Patients' && renderPatientsTab()}
      {activeTab === 'Appointments' && renderAppointmentsTab()}
      {activeTab === 'Revenue' && renderRevenueTab()}
      {activeTab === 'Doctors' && renderDoctorsTab()}
    </DashboardLayout>
  );
}

export default AnalyticsDashboard;

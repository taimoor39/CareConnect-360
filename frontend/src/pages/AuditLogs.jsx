import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  exportAuditLogs,
  getAuditLogById,
  getAuditActions,
  getAuditLogs,
  getAuditStats,
  getAuditUsers,
} from '../api/audit.js';
import AuditFilterBar from '../components/audit/AuditFilterBar.jsx';
import AuditLogDrawer from '../components/audit/AuditLogDrawer.jsx';
import AuditStatCards from '../components/audit/AuditStatCards.jsx';
import AuditTable from '../components/audit/AuditTable.jsx';
import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import { formatAction } from '../utils/auditHelpers.js';
import { exportToCSV } from '../utils/exportCSV.js';
import { exportAnalyticsPDF } from '../utils/exportPDF.js';
import { formatDateTime } from '../utils/dateHelpers.js';
import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from '../utils/isoDate.js';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [pagination, setPagination] = useState({});
  const [availableActions, setAvailableActions] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState('csv');
  const [dateError, setDateError] = useState('');
  const [ipError, setIpError] = useState('');
  const exportRef = useRef(null);
  const defaultTo = todayISOInPakistan();
  const defaultFrom = useMemo(() => {
    const d = parseLocalDateFromISO(defaultTo) || new Date();
    d.setDate(d.getDate() - 7);
    return toISOInputValue(d);
  }, [defaultTo]);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    role: '',
    userId: '',
    targetCollection: '',
    ipAddress: '',
    from: defaultFrom,
    to: defaultTo,
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const validateFilters = useCallback(() => {
    const today = todayISOInPakistan();
    if (filters.from && filters.to && filters.from > filters.to) {
      setDateError('Start date cannot be after end date');
      return false;
    }
    if (filters.to && filters.to > today) {
      setDateError('End date cannot be in the future');
      return false;
    }
    setDateError('');
    if (filters.ipAddress && filters.ipAddress !== '::1') {
      const ip = filters.ipAddress.trim();
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const partialRegex = /^[0-9a-fA-F:.]+$/;
      if (!ipRegex.test(ip) && !partialRegex.test(ip)) {
        setIpError('Invalid IP format');
        return false;
      }
    }
    setIpError('');
    return true;
  }, [filters]);

  const fetchLogs = useCallback(async () => {
    if (!validateFilters()) return;
    setTableLoading(true);
    try {
      const res = await getAuditLogs(filters);
      setLogs(res.data?.data?.logs || []);
      setPagination(res.data?.data?.pagination || {});
      setLastRefreshed(new Date());
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setTableLoading(false);
      if (loading) setLoading(false);
    }
  }, [filters, loading, validateFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    Promise.all([
      getAuditStats().then((r) => setStats(r.data.data)),
      getAuditActions().then((r) => setAvailableActions(r.data.data)),
      getAuditUsers().then((r) => setAvailableUsers(r.data.data)),
    ]).catch(() => {});
    toast.info('Logs auto-refresh every 60 seconds', { autoClose: 3000 });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
      getAuditStats().then((r) => setStats(r.data.data)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    const onDown = (e) => { if (!exportRef.current?.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pills = useMemo(() => {
    const pills = [];
    if (filters.search) pills.push({ key: 'search', label: `Search: ${filters.search}` });
    if (filters.action) pills.push({ key: 'action', label: `Action: ${formatAction(filters.action)}` });
    if (filters.role) pills.push({ key: 'role', label: `Role: ${filters.role}` });
    if (filters.userId) { const user = availableUsers.find((u) => u._id === filters.userId); pills.push({ key: 'userId', label: `User: ${user?.name || 'Selected user'}` }); }
    if (filters.targetCollection) pills.push({ key: 'targetCollection', label: `Collection: ${filters.targetCollection}` });
    if (filters.ipAddress) pills.push({ key: 'ipAddress', label: `IP: ${filters.ipAddress}` });
    if (filters.from !== defaultFrom || filters.to !== defaultTo) pills.push({ key: 'date', label: `Date: ${filters.from} - ${filters.to}` });
    return pills;
  }, [filters, availableUsers, defaultFrom, defaultTo]);

  const clearAllFilters = () => {
    setSearchInput('');
    setFilters((p) => ({ ...p, search: '', action: '', role: '', userId: '', targetCollection: '', ipAddress: '', page: 1 }));
  };

  const removePill = (key) => {
    if (key === 'search') setSearchInput('');
    if (key === 'date') { setFilters((p) => ({ ...p, from: defaultFrom, to: defaultTo, page: 1 })); return; }
    setFilters((p) => ({ ...p, [key]: '', page: 1, ...(key === 'search' ? { search: '' } : {}) }));
  };

  const handlePrevLog = () => {
    if (selectedLogIndex > 0) {
      const newIdx = selectedLogIndex - 1;
      setSelectedLog(logs[newIdx]);
      setSelectedLogIndex(newIdx);
    }
  };

  const handleNextLog = () => {
    if (selectedLogIndex < logs.length - 1) {
      const newIdx = selectedLogIndex + 1;
      setSelectedLog(logs[newIdx]);
      setSelectedLogIndex(newIdx);
    }
  };

  const handleOpenLog = async (log, index) => {
    setSelectedLogIndex(index);
    setDrawerOpen(true);
    try {
      const res = await getAuditLogById(log._id);
      setSelectedLog(res.data?.data || log);
    } catch {
      setSelectedLog(log);
    }
  };

  const buildExportRows = (rowsToExport) => rowsToExport.map((log) => ({
    Timestamp: formatDateTime(log.createdAt),
    Action: formatAction(log.action),
    'Performed By': log.user?.name || 'System',
    Role: log.user?.role || 'system',
    Target: log.target,
    Collection: log.targetCollection || '',
    'IP Address': log.ipAddress || '',
    Details: JSON.stringify(log.details || {}),
  }));

  const doExport = async (format, forceFirstTenThousand = false) => {
    if (!validateFilters()) return;
    setExporting(true);
    try {
      let exportLogs = [];
      if (forceFirstTenThousand) {
        let page = 1;
        while (exportLogs.length < 10000) {
          const res = await getAuditLogs({ ...filters, page, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
          const batch = res.data?.data?.logs || [];
          if (!batch.length) break;
          exportLogs = exportLogs.concat(batch);
          if (batch.length < 100) break;
          page += 1;
        }
        exportLogs = exportLogs.slice(0, 10000);
      } else {
        const res = await exportAuditLogs({ ...filters, page: undefined, limit: undefined });
        exportLogs = res.data?.data?.logs || [];
      }
      if (!exportLogs.length) return;

      if (format === 'csv') {
        exportToCSV(buildExportRows(exportLogs), `CareConnect-AuditLogs-${filters.from}-${filters.to}`);
        toast.success('CSV exported successfully');
      } else {
        exportAnalyticsPDF({
          title: 'Audit Log Report',
          subtitle: 'System activity and compliance trail',
          tableHeaders: ['Timestamp', 'Action', 'User', 'Role', 'Target', 'IP'],
          tableData: exportLogs.map((log) => [
            formatDateTime(log.createdAt),
            formatAction(log.action),
            log.user?.name || 'System',
            log.user?.role || 'system',
            log.target,
            log.ipAddress || '—',
          ]),
          dateRange: { from: filters.from, to: filters.to },
        });
        toast.success('PDF exported successfully');
      }
      setExportOpen(false);
      setShowExportWarning(false);
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error(err.response?.data?.message || 'Too many records — narrow filters', { autoClose: false });
      } else {
        toast.error('Export failed. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="ADMIN PORTAL"
      subline="Security and compliance activity trail"
      headerActions={(
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchLogs} disabled={tableLoading} className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 disabled:opacity-50">
            <span className={tableLoading ? 'inline-block animate-spin' : ''}>↻</span>
            Refresh
          </button>
          <div ref={exportRef} className="relative">
            <button type="button" disabled={exporting || logs.length === 0} title={logs.length === 0 ? 'No logs to export' : ''} onClick={() => setExportOpen((v) => !v)} className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50">
              {exporting ? <span className="inline-block animate-spin">◌</span> : null}
              Export
              <span>▼</span>
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl">
                <button type="button" onClick={() => {
                  if ((pagination.total || 0) > 10000) {
                    setPendingExportFormat('csv');
                    setShowExportWarning(true);
                  } else {
                    doExport('csv');
                  }
                }} className="w-full rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">Export as CSV</button>
                <button type="button" onClick={() => {
                  if ((pagination.total || 0) > 10000) {
                    setPendingExportFormat('pdf');
                    setShowExportWarning(true);
                  } else {
                    doExport('pdf');
                  }
                }} className="w-full rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">Export as PDF</button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    >
      <AuditStatCards stats={stats} />

      {showExportWarning ? (
        <div className="glass-panel rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-100">
          <p className="text-sm">
            ⚠️ Your filters match {(pagination.total || 0).toLocaleString()} logs which exceeds the 10,000 export limit. Please narrow your date range or add more filters.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowExportWarning(false)} className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200">Cancel</button>
            <button type="button" onClick={() => doExport(pendingExportFormat, true)} className="rounded border border-amber-300/40 px-3 py-1 text-xs text-amber-100">Export Anyway (First 10,000)</button>
          </div>
        </div>
      ) : null}

      <AuditFilterBar
        filters={filters}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        availableActions={availableActions}
        availableUsers={availableUsers}
        setFilters={setFilters}
        pills={pills}
        onRemovePill={removePill}
        clearAllFilters={clearAllFilters}
        dateError={dateError}
        ipError={ipError}
      />

      <AuditTable
        logs={logs}
        loading={loading}
        tableLoading={tableLoading}
        pagination={pagination}
        filters={filters}
        setFilters={setFilters}
        onView={handleOpenLog}
        clearAllFilters={clearAllFilters}
        lastRefreshed={lastRefreshed}
      />

      <AuditLogDrawer
        open={drawerOpen}
        log={selectedLog}
        onClose={() => setDrawerOpen(false)}
        onPrev={handlePrevLog}
        onNext={handleNextLog}
        canPrev={selectedLogIndex > 0}
        canNext={selectedLogIndex < logs.length - 1}
      />
    </DashboardLayout>
  );
}

export default AuditLogs;

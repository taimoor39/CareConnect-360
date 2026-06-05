import { useEffect, useMemo, useState } from 'react';

import SeverityDot from './SeverityDot.jsx';
import ActionBadge from './ActionBadge.jsx';
import { getSeverity } from '../../utils/auditHelpers.js';
import { formatTimeInPakistan } from '../../utils/isoDate.js';
import { formatDate } from '../../utils/dateHelpers.js';

const ROLE_BADGE = {
  admin: 'bg-rose-500/15 text-rose-100 border-rose-300/30',
  doctor: 'bg-sky-500/15 text-sky-100 border-sky-300/30',
  receptionist: 'bg-amber-500/15 text-amber-100 border-amber-300/30',
  patient: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/30',
  system: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function relativeFromNow(date) {
  if (!date) return '—';
  const ms = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ms)) return '—';
  if (ms < 30_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function buildPageList(current, total) {
  const out = new Set([1, total, current, current - 1, current + 1, 2, total - 1]);
  return Array.from(out)
    .filter((p) => Number.isFinite(p) && p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

function AuditTable({
  logs,
  loading,
  tableLoading,
  pagination,
  filters,
  setFilters,
  onView,
  clearAllFilters,
  lastRefreshed,
}) {
  const [tick, setTick] = useState(0);
  // Re-render every 30s to keep "Updated: X mins ago" fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const total = Number(pagination?.total ?? 0);
  const limit = Number(pagination?.limit || filters?.limit || 25);
  const page = Number(pagination?.page || filters?.page || 1);
  const pages = Number(pagination?.pages || 1);

  const rangeStart = total > 0 ? (page - 1) * limit + 1 : 0;
  const rangeEnd = total > 0 ? Math.min(page * limit, total) : 0;

  const pageList = useMemo(() => buildPageList(page, pages), [page, pages]);
  const updatedLabel = useMemo(() => relativeFromNow(lastRefreshed), [lastRefreshed, tick]);

  const goToPage = (target) => {
    const next = Math.max(1, Math.min(pages, target));
    if (next === page) return;
    setFilters((p) => ({ ...p, page: next }));
  };

  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-white">Activity Log</h2>
          <p className="text-[11px] text-slate-400">
            Showing {logs.length} of {total} total logs
          </p>
        </div>
        <p className="text-[11px] text-slate-400">Updated: {updatedLabel}</p>
      </div>
      <div className="relative overflow-x-auto">
        {tableLoading && !loading ? <div className="absolute inset-0 z-10 bg-slate-950/45" /> : null}
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading audit logs...</td>
              </tr>
            ) : null}
            {!loading && logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  <p className="text-2xl">🛡️</p>
                  <p className="mt-2 text-sm text-slate-300">No audit logs found</p>
                  <p className="mt-1 text-[11px] text-slate-500">Try adjusting your filters or date range</p>
                  <button type="button" onClick={clearAllFilters} className="mt-3 rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
                    Clear Filters
                  </button>
                </td>
              </tr>
            ) : null}
            {!loading
              ? logs.map((log, index) => {
                  const severity = getSeverity(log.action);
                  const role = log.user?.role || (log.userId ? 'unknown' : 'system');
                  const roleClass = ROLE_BADGE[role] || ROLE_BADGE.system;
                  return (
                    <tr
                      key={log._id}
                      onClick={() => onView(log, index)}
                      className={`cursor-pointer border-b border-slate-800/60 hover:bg-slate-900/70 ${severity === 'critical' ? 'border-l-2 border-l-rose-400/60' : ''}`}
                    >
                      <td className="px-3 py-2"><SeverityDot severity={severity} /></td>
                      <td className="px-3 py-2">
                        <p className="text-slate-100">{formatDate(log.createdAt)}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatTimeInPakistan(log.createdAt, 'en-US', { hour12: true, second: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-slate-200">{log.user?.name || 'System'}</p>
                        <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] capitalize ${roleClass}`}>
                          {role}
                        </span>
                      </td>
                      <td className="px-3 py-2"><ActionBadge action={log.action} /></td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-slate-300" title={log.target}>
                        {log.target || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">
                        {log.ipAddress === '::1' ? 'localhost' : (log.ipAddress || 'System')}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onView(log, index); }}
                          disabled={!log.details || !Object.keys(log.details).length}
                          title={(!log.details || !Object.keys(log.details).length) ? 'No additional details' : ''}
                          className="rounded border border-sky-300/25 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100 disabled:opacity-40"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((p) => ({ ...p, page: 1, limit: e.target.value }))}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              setFilters((p) => ({ ...p, page: 1, limit: Number.isNaN(n) ? 10 : n }));
            }}
            className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <p>
          Showing {rangeStart}–{rangeEnd} of {total} logs
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
          >
            ←
          </button>
          {pageList.map((p, idx) => {
            const prev = pageList[idx - 1];
            const showGap = prev && p - prev > 1;
            return (
              <span key={p} className="flex items-center gap-1">
                {showGap ? <span className="px-1 text-slate-500">…</span> : null}
                <button
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`min-w-[28px] rounded px-2 py-1 ${
                    p === page
                      ? 'border border-teal-300/40 bg-teal-500/15 text-teal-100'
                      : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pages}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </article>
  );
}

export default AuditTable;

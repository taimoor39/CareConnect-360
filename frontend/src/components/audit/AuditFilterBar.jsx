import AuditFilterPills from './AuditFilterPills.jsx';
import { formatAction } from '../../utils/auditHelpers.js';
import { todayISOInPakistan } from '../../utils/isoDate.js';

const ROLE_OPTIONS = ['admin', 'doctor', 'receptionist', 'patient', 'system'];
const TARGET_COLLECTION_OPTIONS = ['users', 'patients', 'appointments', 'invoices', 'doctorProfiles', 'engagementLogs', 'auditLogs', 'consultations', 'reports'];

function AuditFilterBar({
  filters,
  searchInput,
  setSearchInput,
  availableActions,
  availableUsers,
  setFilters,
  pills,
  onRemovePill,
  clearAllFilters,
  dateError,
  ipError,
}) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-2 text-slate-500">⌕</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user name, action, or target..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-8 pr-8 text-xs text-slate-100"
          />
          {searchInput ? (
            <button type="button" onClick={() => setSearchInput('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200">×</button>
          ) : null}
        </div>
        <select value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value, page: 1 }))} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100">
          <option value="">All Actions</option>
          {availableActions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
        </select>
        <select value={filters.role} onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value, page: 1 }))} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <input type="date" max={todayISOInPakistan()} value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value, page: 1 }))} style={{ colorScheme: 'dark' }} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100" />
        <input type="date" max={todayISOInPakistan()} value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value, page: 1 }))} style={{ colorScheme: 'dark' }} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100" />
      </div>
      {(dateError || ipError) ? <p className="mt-2 text-xs text-rose-300">{dateError || ipError}</p> : null}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <input value={filters.ipAddress} onChange={(e) => setFilters((p) => ({ ...p, ipAddress: e.target.value, page: 1 }))} placeholder="Filter by IP address..." className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100" />
        <select value={filters.targetCollection} onChange={(e) => setFilters((p) => ({ ...p, targetCollection: e.target.value, page: 1 }))} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100">
          <option value="">All Collections</option>
          {TARGET_COLLECTION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value, page: 1 }))} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100">
          <option value="">All Users</option>
          {availableUsers.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
        </select>
      </div>
      <AuditFilterPills pills={pills} onRemove={onRemovePill} onClear={clearAllFilters} />
    </section>
  );
}

export default AuditFilterBar;

function AuditStatCards({ stats }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      <div className="glass-panel rounded-xl border-l-4 border-l-teal-400 px-3 py-2">
        <p className="text-[11px] text-slate-400">TOTAL LOGS TODAY</p>
        <p className="text-lg font-semibold text-white">{stats?.totalToday || 0}</p>
        <p className="text-[11px] text-slate-500">Actions logged today</p>
      </div>
      <div className="glass-panel rounded-xl border-l-4 border-l-rose-400 px-3 py-2">
        <p className="text-[11px] text-slate-400">CRITICAL ACTIONS</p>
        <p className={`text-lg font-semibold ${(stats?.criticalToday || 0) > 0 ? 'text-rose-200' : 'text-slate-300'}`}>
          {stats?.criticalToday || 0}
        </p>
        <p className="text-[11px] text-slate-500">Sensitive operations today</p>
      </div>
      <div className="glass-panel rounded-xl border-l-4 border-l-sky-400 px-3 py-2">
        <p className="text-[11px] text-slate-400">ACTIVE USERS TODAY</p>
        <p className="text-lg font-semibold text-white">{stats?.activeUsersToday || 0}</p>
        <p className="text-[11px] text-slate-500">Users active today</p>
      </div>
      <div className="glass-panel rounded-xl border-l-4 border-l-amber-400 px-3 py-2">
        <p className="text-[11px] text-slate-400">LOG RETENTION</p>
        <p className="text-lg font-semibold text-amber-200">{stats?.retentionDays || 365} days</p>
        <p className="text-[11px] text-slate-500">Auto-delete after 365 days</p>
      </div>
    </div>
  );
}

export default AuditStatCards;

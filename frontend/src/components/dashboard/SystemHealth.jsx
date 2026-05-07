function SystemHealth({ data }) {
  if (data === null) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Health check failed</div>;
  const checks = data?.checks || [];
  const warning = checks.some((c) => ['Offline', 'Slow', 'Error', 'Not Configured'].includes(c.status));

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">System Status</h3>
        <span className={`rounded-full px-2 py-1 text-xs ${warning ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>{warning ? 'Attention Required' : 'All Systems Operational'}</span>
      </div>
      <div className="space-y-2 text-xs">
        {checks.map((check) => (
          <div key={check.service} className="rounded-lg bg-slate-900/70 px-3 py-2">
            <div className="flex items-center justify-between"><span className="text-slate-200">{check.service}</span><span className={check.status === 'Online' || check.status === 'Configured' || check.status === 'Active' ? 'text-emerald-300' : check.status === 'Slow' ? 'text-amber-300' : 'text-rose-300'}>{check.status}</span></div>
            <p className="text-slate-400">{check.responseMs ? `${check.responseMs} ms` : '--'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemHealth;

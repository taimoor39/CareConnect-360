import { formatRelativeTime } from '../../utils/dateHelpers.js';

function RecentActivity({ data }) {
  if (data === null) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Activity feed unavailable</div>;
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Recent Activity</h3>
      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {data.map((log) => (
          <div key={log._id} className="rounded-lg bg-slate-900/70 p-2 transition hover:bg-slate-800/75">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-200">{log.action}</p>
              <p className="text-[11px] text-slate-400">{formatRelativeTime(log.createdAt)}</p>
            </div>
            <p className="text-[11px] text-slate-400">By: {log.userId?.name || 'System'}</p>
            <p className="text-[11px] text-slate-400">Target: {log.target || '--'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;

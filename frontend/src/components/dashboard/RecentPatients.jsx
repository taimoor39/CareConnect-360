import { useNavigate } from 'react-router-dom';

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} d ago`;
  return `${Math.floor(sec / 604800)} wk ago`;
}

function RecentPatients({ data }) {
  const navigate = useNavigate();
  if (data === null) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Could not load recent patients</div>;
  const patients = data?.patients || [];

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Recent Patients</h3>
        <button type="button" className="text-xs text-teal-300 transition hover:text-teal-200" onClick={() => navigate('/patients')}>View All &rarr;</button>
      </div>
      <div className="space-y-2">
        {patients.map((p) => (
          <button key={p._id} type="button" onClick={() => navigate(`/patients?patientId=${p._id}`)} className="flex w-full items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-left transition hover:bg-slate-800/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs text-teal-200">{String(p.name || 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{p.name || '--'}</p>
              <p className="truncate text-[11px] text-slate-400">{p.patientId || p.patientCode}</p>
              <p className="truncate text-[10px] text-slate-500">{timeAgo(p.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RecentPatients;

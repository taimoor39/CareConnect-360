import { formatDateInPakistan, formatTimeInPakistan } from '../../utils/isoDate.js';

function PendingReportsList({ pendingReports, onReview }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <h2 className="text-base font-semibold text-white">Reports Awaiting Your Review</h2>
      <div className="mt-3 space-y-2">
        {pendingReports.length === 0 ? (
          <p className="py-6 text-center text-emerald-300">No pending summaries ✓</p>
        ) : pendingReports.map((row) => (
          <article key={row._id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-sm text-white">{row.patientId?.name || '--'} <span className="font-mono text-[11px] text-slate-400">{row.patientId?.patientId || row.patientId?.patientCode || '--'}</span></p>
            <p className="text-xs text-slate-400">{row.title}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">Generated: {formatDateInPakistan(row.createdAt)} {formatTimeInPakistan(row.createdAt)}</p>
              <button type="button" onClick={() => onReview(row)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-100">Review Summary →</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PendingReportsList;


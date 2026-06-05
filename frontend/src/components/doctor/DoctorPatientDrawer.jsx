import { formatDateInPakistan } from '../../utils/isoDate.js';

function DoctorPatientDrawer({ open, detail, onClose }) {
  if (!open || !detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{detail.patient?.name}</h3>
          <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={onClose}>×</button>
        </div>

        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Visit History</p>
          {(detail.visitHistory || []).map((a) => (
            <article key={a._id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-sm text-slate-200">{formatDateInPakistan(a.date)} | {a.status}</p>
              <p className="text-xs text-slate-400">{a.consultationNotes || 'No consultation notes yet'}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Reports</p>
          {(detail.reports || []).map((r) => (
            <article key={r._id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <p className="text-slate-100">{r.title}</p>
              <p className="text-slate-400">{formatDateInPakistan(r.createdAt)} | {r.summaryStatus}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Prescriptions</p>
          {(detail.prescriptions || []).map((p) => (
            <article key={p._id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <p className="text-slate-100">{formatDateInPakistan(p.createdAt)}</p>
              <p className="text-slate-400">{(p.items || []).map((m) => m.medicineName).join(', ')}</p>
            </article>
          ))}
        </section>
      </aside>
    </div>
  );
}

export default DoctorPatientDrawer;


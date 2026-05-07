import { formatDate } from '../../utils/dateHelpers.js';

const statusBadgeClass = {
  Active: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25',
  Inactive: 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25',
  Discharged: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25',
};

const getInitials = (patient) => {
  const parts = String(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).trim().split(/\s+/);
  const first = (parts[0] || '').charAt(0);
  const last = (parts[1] || '').charAt(0);
  return `${first}${last}`.toUpperCase() || 'P';
};

function PatientDetailDrawer({ patient, open, onClose, onEdit, onArchive, onCreateLogin, showArchive = true }) {
  if (!open || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Patient Details</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">&times;</button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400/15 text-lg font-semibold text-teal-100 ring-1 ring-teal-300/25">
              {getInitials(patient)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-xl text-white">{patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()}</h4>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-mono text-slate-300">{patient.patientId || patient.patientCode || '-'}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{typeof patient.age === 'number' ? patient.age : '-'} • {patient.gender || 'Other'} • {patient.bloodGroup || '—'}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
            <div><span className="text-slate-400">Phone:</span> <span className="text-white">{patient.phone || patient.contact?.phone || '-'}</span></div>
            <div><span className="text-slate-400">Email:</span> <span className="text-white">{patient.email || patient.contact?.email || '-'}</span></div>
            <div><span className="text-slate-400">Address:</span> <span className="text-white">{patient.address?.street || patient.address?.line1 || '-'}{patient.address?.city ? `, ${patient.address.city}` : ''}</span></div>
            <div><span className="text-slate-400">Status:</span> <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusBadgeClass[patient.status] || statusBadgeClass.Inactive}`}>{patient.status || 'Inactive'}</span></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Medical Notes</p>
            <p className="mt-2 text-sm text-slate-200">{patient.medicalNotes || patient.medical?.notes || 'No medical notes provided.'}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Account Details</p>
            <div className="mt-2 text-sm text-slate-200">
              <span className="text-slate-400">Portal Access:</span>{' '}
              {patient.userId ? (
                <>
                  <span className="text-emerald-400">● Enabled</span>
                  <div className="mt-1"><span className="text-slate-400">Email:</span> {patient.email || patient.contact?.email || '-'}</div>
                </>
              ) : (
                <>
                  <span className="text-slate-500">○ No Login Account</span>
                  <div className="mt-2">
                    <button type="button" onClick={() => typeof onCreateLogin === 'function' && onCreateLogin(patient)} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-100 transition hover:bg-teal-400/20">
                      Create Login Account →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <p>Registered on: {patient.createdAt ? formatDate(patient.createdAt) : '-'}</p>
            <div className="flex gap-2">
              <button type="button" onClick={onEdit} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-amber-100">Edit</button>
              {showArchive ? <button type="button" onClick={onArchive} className="rounded-md border border-rose-300/30 px-3 py-1.5 text-rose-100">Archive</button> : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default PatientDetailDrawer;

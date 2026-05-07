import { formatDateInPakistan } from '../../utils/isoDate.js';

const statusClass = {
  Scheduled: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-300/25',
  'Checked-In': 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-300/25',
  'In-Progress': 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/25',
  Completed: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/25',
  Missed: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/25',
  Cancelled: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/25',
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${(parts[0] || '').charAt(0)}${(parts[1] || '').charAt(0)}`.toUpperCase() || 'P';
};

function AppointmentDetailDrawer({ open, appointment, onClose, renderActions, onDownloadQr }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Appointment Details</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">&times;</button>
        </div>
        {!appointment ? (
          <p className="mt-8 text-sm text-slate-400">Loading appointment...</p>
        ) : (
          <div className="mt-4 space-y-5">
            <section>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Patient Info</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-400/15 text-sm font-semibold text-teal-100">{getInitials(appointment.patientId?.name)}</div>
                <div>
                  <p className="text-lg text-white">{appointment.patientId?.name || '--'}</p>
                  <span className="rounded-full bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-300">{appointment.patientId?.patientId || appointment.patientId?.patientCode || '--'}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{appointment.patientId?.phone || '--'} | {appointment.patientId?.email || '--'} | {appointment.patientId?.bloodGroup || '--'}</p>
            </section>
            <section>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Doctor Info</p>
              <p className="mt-2 text-white">Dr. {appointment.doctorId?.name || '--'}</p>
              <p className="text-xs text-slate-400">{appointment.doctorProfile?.specialization || '--'}</p>
              <p className="text-xs text-slate-500">{appointment.doctorProfile?.qualification || '--'}</p>
            </section>
            <section>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Appointment Info</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[appointment.status] || statusClass.Cancelled}`}>{appointment.status}</span>
              <p className="mt-2 text-sm text-slate-200">Date: {formatDateInPakistan(appointment.date, 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-sm text-slate-200">Time: {appointment.timeSlot}</p>
              <p className="mt-2 text-sm text-slate-300">Reason for visit: {appointment.reasonForVisit || '--'}</p>
              {['Scheduled', 'Checked-In'].includes(appointment.status) && appointment.qrCodeImage ? (
                <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                  <img src={appointment.qrCodeImage} alt="Appointment QR Code" style={{ width: 200, height: 200 }} className="rounded bg-white p-2" />
                  <p className="mt-2 text-xs text-slate-400">Patient presents this at reception for check-in</p>
                </div>
              ) : null}
            </section>
            <section>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Notes</p>
              <p className="mt-2 text-sm text-slate-300">{appointment.notes || '--'}</p>
              {appointment.followUpDate ? <p className="text-xs text-slate-500">Follow-up: {formatDateInPakistan(appointment.followUpDate)}</p> : null}
            </section>
            <div className="border-t border-slate-700 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {renderActions?.(appointment)}
                {appointment.qrCodeImage ? <button type="button" onClick={() => onDownloadQr(appointment)} className="rounded-md border border-teal-300/25 px-3 py-1 text-xs text-teal-100">Download QR</button> : null}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default AppointmentDetailDrawer;

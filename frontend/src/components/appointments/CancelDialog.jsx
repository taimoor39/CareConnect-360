import { formatDateInPakistan } from '../../utils/isoDate.js';

function CancelDialog({ open, appointment, reason, setReason, saving, onClose, onConfirm }) {
  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Cancel Appointment?</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">Close</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="space-y-1 text-xs text-slate-300">
            <p>Patient: {appointment.patientId?.name || '--'}</p>
            <p>Doctor: Dr. {appointment.doctorId?.name || '--'}</p>
            <p>Date: {formatDateInPakistan(appointment.date)} | {appointment.timeSlot}</p>
          </div>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Please provide a reason for cancellation..."
            rows={3}
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
          />
          <p className="mt-1 text-[11px] text-slate-400">{reason.length}/500</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Keep Appointment</button>
          <button
            type="button"
            disabled={reason.trim().length < 10 || saving}
            onClick={onConfirm}
            className="h-9 rounded-lg border border-rose-300/30 bg-rose-500/20 px-4 text-xs font-semibold text-rose-100 disabled:opacity-50"
          >
            {saving ? 'Cancelling...' : 'Cancel Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelDialog;

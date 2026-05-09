import CareModal from '@/shared/components/CareModal.jsx';
import { formatDateInPakistan } from '../../utils/isoDate.js';

function CancelDialog({ open, appointment, reason, setReason, saving, onClose, onConfirm }) {
  if (!open || !appointment) return null;

  return (
    <CareModal
      open={open}
      onClose={onClose}
      title="Cancel appointment?"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            Keep appointment
          </button>
          <button
            type="button"
            disabled={reason.trim().length < 10 || saving}
            onClick={onConfirm}
            className="rounded-[var(--radius-md)] border border-rose-300/30 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 disabled:opacity-50"
          >
            {saving ? 'Cancelling…' : 'Cancel appointment'}
          </button>
        </>
      }
    >
      <div className="space-y-1 text-xs text-[var(--text-secondary)]">
        <p>Patient: {appointment.patientId?.name || '—'}</p>
        <p>Doctor: Dr. {appointment.doctorId?.name || '—'}</p>
        <p>
          Date: {formatDateInPakistan(appointment.date)} | {appointment.timeSlot}
        </p>
      </div>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Please provide a reason for cancellation..."
        rows={3}
        className="mt-3"
      />
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{reason.length}/500</p>
    </CareModal>
  );
}

export default CancelDialog;

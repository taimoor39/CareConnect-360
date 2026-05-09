import CareModal from '@/shared/components/CareModal.jsx';

function RejectRequestModal({
  target,
  reason,
  setReason,
  loading = false,
  onReject,
  onClose,
}) {
  if (!target) return null;

  return (
    <CareModal
      open={!!target}
      onClose={onClose}
      title="Reject portal access request"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onReject}
            className="rounded-[var(--radius-md)] border border-rose-400/40 px-4 py-2 text-xs text-rose-200 disabled:opacity-60"
          >
            {loading ? 'Rejecting…' : 'Reject request'}
          </button>
        </>
      }
    >
      <p className="text-xs text-[var(--text-secondary)]">Patient: {target.patientId?.name || '—'}</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="Reason for rejection (optional)..."
        className="mt-3"
      />
      <div className="mt-1 text-right text-[11px] text-[var(--text-muted)]">{reason.length}/500</div>
    </CareModal>
  );
}

export default RejectRequestModal;

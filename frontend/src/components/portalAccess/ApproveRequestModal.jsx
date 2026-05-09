import CareModal from '@/shared/components/CareModal.jsx';

function ApproveRequestModal({
  target,
  loading = false,
  success = null,
  onApprove,
  onClose,
}) {
  if (!target) return null;

  return (
    <CareModal
      open={!!target}
      onClose={onClose}
      title={success ? 'Account created' : 'Approve portal access'}
      footer={
        success ? (
          <button type="button" onClick={onClose} className="care-btn-primary">
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
            >
              Cancel
            </button>
            <button type="button" disabled={loading} onClick={onApprove} className="care-btn-primary disabled:opacity-60">
              {loading ? 'Creating account…' : 'Create account & send email'}
            </button>
          </>
        )
      }
    >
      {!success ? (
        <>
          <div className="text-xs text-[var(--text-secondary)]">
            <p>
              Patient: {target.patientId?.name} ({target.patientId?.patientId})
            </p>
            <p>Email: {target.requestedEmail}</p>
            <p>Requested by: {target.requestedBy?.name || '—'}</p>
          </div>
          <div className="mt-3 rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--text-secondary)]">
            <p>Approving will:</p>
            <p>Create a login account for this patient</p>
            <p>Send them a welcome email with temp password</p>
            <p>Link their patient record to the new account</p>
            <p>Patient must change password on first login</p>
          </div>
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-emerald-300">Account created for {target.patientId?.name}</p>
          <p className="text-[var(--text-secondary)]">Welcome email sent to {success.email}</p>
        </div>
      )}
    </CareModal>
  );
}

export default ApproveRequestModal;

function ApproveRequestModal({
  target,
  loading = false,
  success = null,
  onApprove,
  onClose,
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4">
        {!success ? (
          <>
            <h3 className="text-base font-semibold text-white">Approve Portal Access</h3>
            <div className="mt-2 text-xs text-slate-300">
              <p>Patient: {target.patientId?.name} ({target.patientId?.patientId})</p>
              <p>Email: {target.requestedEmail}</p>
              <p>Requested by: {target.requestedBy?.name || '-'}</p>
            </div>
            <div className="mt-3 rounded-lg border border-slate-700 p-3 text-xs text-slate-300">
              <p>Approving will:</p>
              <p>✓ Create a login account for this patient</p>
              <p>✓ Send them a welcome email with temp password</p>
              <p>✓ Link their patient record to the new account</p>
              <p>✓ Patient must change password on first login</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
              <button type="button" disabled={loading} onClick={onApprove} className="rounded bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60">
                {loading ? 'Creating account...' : 'Create Account & Send Email'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-emerald-300">✅ Account created for {target.patientId?.name}</p>
            <p className="text-slate-300">Welcome email sent to {success.email}</p>
            <button type="button" onClick={onClose} className="rounded bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApproveRequestModal;

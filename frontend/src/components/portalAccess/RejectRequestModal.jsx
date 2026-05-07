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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-base font-semibold text-white">Reject Portal Access Request</h3>
        <p className="mt-2 text-xs text-slate-300">Patient: {target.patientId?.name || '-'}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Reason for rejection (optional)..."
          className="mt-3 h-24 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
        />
        <div className="mt-1 text-right text-[11px] text-slate-400">{reason.length}/500</div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
          <button type="button" disabled={loading} onClick={onReject} className="rounded border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-60">
            {loading ? 'Rejecting...' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectRequestModal;

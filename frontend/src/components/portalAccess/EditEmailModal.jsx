function EditEmailModal({
  target,
  email,
  setEmail,
  error,
  setError,
  loading = false,
  onSave,
  onClose,
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-base font-semibold text-white">Edit Requested Email</h3>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
        />
        {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
          <button type="button" disabled={loading} onClick={onSave} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-60">
            {loading ? 'Updating...' : 'Update Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditEmailModal;

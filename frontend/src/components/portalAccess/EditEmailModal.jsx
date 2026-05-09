import CareModal from '@/shared/components/CareModal.jsx';

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
    <CareModal
      open={!!target}
      onClose={onClose}
      title="Edit requested email"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            Cancel
          </button>
          <button type="button" disabled={loading} onClick={onSave} className="care-btn-primary disabled:opacity-60">
            {loading ? 'Updating…' : 'Update email'}
          </button>
        </>
      }
    >
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
      />
      {error ? <p className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
    </CareModal>
  );
}

export default EditEmailModal;

import CareModal from '@/shared/components/CareModal.jsx';

function EmailPreviewModal({ open, title, subject, body, onClose }) {
  return (
    <CareModal
      open={open}
      onClose={onClose}
      title={title || 'Email preview'}
      size="wide"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
        >
          Close
        </button>
      }
    >
      <p className="care-field-label">Subject</p>
      <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--text-primary)]">{subject}</p>
      <p className="care-field-label mt-4">Body</p>
      <div className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--text-primary)]">
        {body}
      </div>
    </CareModal>
  );
}

export default EmailPreviewModal;

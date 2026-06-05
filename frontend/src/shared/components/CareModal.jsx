import { useEffect, useId } from 'react';

/**
 * Step 9 — centered modal shell (overlay + card + header + body + optional footer).
 * @param {'standard' | 'wide' | '3xl'} [size='standard'] — 560px / 680px / 768px max-width
 */
function CareModal({ open, onClose, title, children, footer = null, size = 'standard', alignTop = false, bodyClassName = '' }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className={`care-modal-overlay${alignTop ? ' care-modal-overlay--top' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`care-modal-dialog${size === 'wide' ? ' care-modal-dialog--wide' : ''}${size === '3xl' ? ' care-modal-dialog--3xl' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="care-modal-header">
          <h2 id={titleId} className="care-modal-title">
            {title}
          </h2>
          <button type="button" className="care-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={`care-modal-body ${bodyClassName}`.trim()}>{children}</div>
        {footer != null && footer !== false ? <footer className="care-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export default CareModal;

function EmailPreviewModal({ open, title, subject, body, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-base font-medium text-white">{title}</h3>
        <p className="mt-2 text-xs text-slate-400">Subject</p>
        <p className="rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100">{subject}</p>
        <p className="mt-2 text-xs text-slate-400">Body</p>
        <div className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100">{body}</div>
        <div className="mt-3 text-right">
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200">Close</button>
        </div>
      </div>
    </div>
  );
}

export default EmailPreviewModal;

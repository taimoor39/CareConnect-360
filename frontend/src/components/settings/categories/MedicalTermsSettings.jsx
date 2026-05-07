import { formatDate } from '../../../utils/dateHelpers.js';
import SettingsSection from '../shared/SettingsSection.jsx';

function MedicalTermsSettings({
  terms,
  pagination,
  search,
  onSearchChange,
  onSearchSubmit,
  termEditor,
  onTermEditorChange,
  onAddStart,
  onAddCancel,
  onAddSave,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete,
  inlineError,
  onPageChange,
}) {
  return (
    <SettingsSection title="Medical Term Simplification" subtitle="Dictionary used to simplify AI report summaries">
      <div className="flex items-center justify-between gap-2">
        <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search medical terms..." className="h-10 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" />
        <button type="button" onClick={onSearchSubmit} className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200">Search</button>
        <button type="button" onClick={onAddStart} className="rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100">+ Add Term</button>
      </div>
      {termEditor.mode === 'add' ? (
        <div className="mt-3 grid gap-2 rounded border border-slate-700 bg-slate-900/40 p-2 md:grid-cols-[1fr_1fr_auto_auto]">
          <input value={termEditor.medicalTerm} onChange={(e) => onTermEditorChange({ ...termEditor, medicalTerm: e.target.value })} placeholder="Medical Term" className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs" />
          <input value={termEditor.simplifiedTerm} onChange={(e) => onTermEditorChange({ ...termEditor, simplifiedTerm: e.target.value })} placeholder="Simplified Term" className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs" />
          <button type="button" onClick={onAddSave} className="rounded border border-teal-300/30 px-2 py-1 text-xs text-teal-100">Save</button>
          <button type="button" onClick={onAddCancel} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Cancel</button>
        </div>
      ) : null}
      {inlineError ? <p className="mt-2 text-xs text-rose-300">{inlineError}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">Medical Term</th><th className="px-2 py-2 text-left">Simplified Term</th><th className="px-2 py-2 text-left">Added By</th><th className="px-2 py-2 text-left">Date</th><th className="px-2 py-2 text-left">Actions</th></tr></thead>
          <tbody>
            {terms.map((term, idx) => (
              <tr key={term._id} className="border-b border-slate-800/60">
                <td className="px-2 py-2 text-slate-300">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                <td className="px-2 py-2 text-slate-100">
                  {termEditor.mode === 'edit' && termEditor.id === term._id
                    ? <input value={termEditor.medicalTerm} onChange={(e) => onTermEditorChange({ ...termEditor, medicalTerm: e.target.value })} className="h-8 rounded border border-slate-700 bg-slate-950 px-2 text-xs" />
                    : term.medicalTerm}
                </td>
                <td className="px-2 py-2 text-slate-300">
                  {termEditor.mode === 'edit' && termEditor.id === term._id
                    ? <input value={termEditor.simplifiedTerm} onChange={(e) => onTermEditorChange({ ...termEditor, simplifiedTerm: e.target.value })} className="h-8 rounded border border-slate-700 bg-slate-950 px-2 text-xs" />
                    : term.simplifiedTerm}
                </td>
                <td className="px-2 py-2 text-slate-300">{term.addedBy?.name || '—'}</td>
                <td className="px-2 py-2 text-slate-300">{formatDate(term.createdAt)}</td>
                <td className="px-2 py-2">
                  {termEditor.mode === 'edit' && termEditor.id === term._id ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={onEditSave} className="rounded border border-teal-300/30 px-2 py-1 text-[11px] text-teal-100">Save</button>
                      <button type="button" onClick={onEditCancel} className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onEditStart(term)} className="rounded border border-amber-300/30 px-2 py-1 text-[11px] text-amber-100">Edit</button>
                      <button type="button" onClick={() => onDelete(term)} className="rounded border border-rose-300/30 px-2 py-1 text-[11px] text-rose-100">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
        <span>Page {pagination.page} of {pagination.pages}</span>
        <div className="flex gap-1">
          <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50">Prev</button>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)} className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </SettingsSection>
  );
}

export default MedicalTermsSettings;

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  approveAISummary,
  deleteConsultationReport,
  generateAISummary,
  getDoctorReports,
  replaceConsultationReport,
} from '../../api/doctor.js';
import {
  aiSummaryErrorMessage,
  resolveConsultationId,
  runRegenerateAISummary,
} from '../../utils/regenerateAISummary.js';
import AISummaryReview from '../../components/doctor/AISummaryReview.jsx';
import DoctorLayout from '@/shared/layouts/DoctorLayout.jsx';
import CareModal from '@/shared/components/CareModal.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan } from '../../utils/isoDate.js';

const statusClass = {
  'Not Generated': 'bg-slate-700 text-slate-200',
  'Pending Approval': 'bg-amber-500/20 text-amber-200',
  Approved: 'bg-emerald-500/20 text-emerald-200',
  Rejected: 'bg-rose-500/20 text-rose-200',
};

function mergeReportRow(prev, rowId, patch) {
  return prev.map((r) => (String(r._id) === String(rowId) ? { ...r, ...patch } : r));
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Replace Report Modal ───────────────────────────────────────────────────────
function ReplaceReportModal({ report, onClose, onSaved, onFileDeleted }) {
  const [title, setTitle] = useState(report?.title || '');
  const [text, setText] = useState(report?.originalText || '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // true after a successful delete — keeps modal open for fresh upload
  const [reportDeleted, setReportDeleted] = useState(false);
  const fileRef = useRef(null);

  const consultationId = resolveConsultationId(report);
  const isPdf = report?.fileType === 'pdf';
  const hasSummary = !reportDeleted && report?.summaryStatus && report.summaryStatus !== 'Not Generated';
  const isApproved = !reportDeleted && report?.summaryStatus === 'Approved';
  const busy = saving || deleting;

  const [mode, setMode] = useState(isPdf ? 'pdf' : 'text');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Only PDF files are accepted'); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('File too large (max 10 MB)'); return; }
    setFile(f);
  };

  const handleDelete = async () => {
    const msg = isApproved
      ? 'Delete this report permanently? The AI summary approved for the patient will also be removed. This cannot be undone.'
      : 'Delete this report permanently? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await deleteConsultationReport(consultationId);
      toast.success('Report deleted — you can now upload a new one');
      // Notify parent that the DB record was wiped (parent will hold the row
      // in the list and only remove it if this modal is closed without a
      // new upload being saved).
      onFileDeleted(consultationId);
      setReportDeleted(true);
      setTitle('');
      setText('');
      setFile(null);
      setMode('pdf');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (mode === 'text' && text.trim().length < 10) {
      toast.error('Report text is too short (min 10 characters)');
      return;
    }
    if (mode === 'pdf' && !file) {
      toast.error('Please select a PDF file to upload');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (mode === 'pdf') {
        res = await replaceConsultationReport(consultationId, { title: title.trim() }, file);
      } else if (mode === 'text') {
        res = await replaceConsultationReport(consultationId, { title: title.trim(), originalText: text.trim() });
      } else {
        res = await replaceConsultationReport(consultationId, { title: title.trim() });
      }

      const updated = res.data?.data;
      const summaryReset = res.data?.summaryReset;
      onSaved(updated, summaryReset);
      toast.success(summaryReset ? 'Report saved — AI summary has been reset' : 'Report title updated');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-sm text-slate-200">

      {/* Current report row with × delete button — hidden after deletion */}
      {!reportDeleted && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-xs">
          <svg className="h-4 w-4 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-200">{report?.title}</p>
            <p className="text-slate-500">{isPdf ? (report.pdfName || 'PDF') : 'Text report'}{report.pdfSizeBytes ? ` · ${formatBytes(report.pdfSizeBytes)}` : ''}</p>
          </div>
          <button
            type="button"
            title="Delete this report permanently"
            disabled={busy}
            onClick={handleDelete}
            className="shrink-0 rounded border border-rose-500/40 px-2 py-0.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
          >
            {deleting ? '…' : '×'}
          </button>
        </div>
      )}

      {/* After deletion: prompt to upload a new report */}
      {reportDeleted && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200">
          Previous report deleted. Fill in the form below to upload a new one.
        </div>
      )}

      {/* Summary warning */}
      {hasSummary && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${isApproved ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
          <span className="shrink-0">{isApproved ? '⚠' : 'ℹ'}</span>
          <span>
            {isApproved
              ? 'This report has an approved summary the patient can see. Replacing content will reset the summary and hide it until re-approved.'
              : 'Replacing the report content will reset the AI summary to "Not Generated".'}
          </span>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Report Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
          placeholder="Enter report title"
        />
      </div>

      {/* Mode selector — "Title only" is hidden after deletion since there's nothing to preserve */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">
          {reportDeleted ? 'Upload new report as' : 'Replace content with'}
        </label>
        <div className="flex gap-2">
          {[['pdf', 'New PDF file'], ['text', 'Text content'], ...(!reportDeleted ? [['title-only', 'Title only']] : [])].map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => { setMode(key); if (key !== 'pdf') setFile(null); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${mode === key ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* PDF upload area */}
      {mode === 'pdf' && (
        <div>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/30 px-4 py-6 text-center hover:border-indigo-500/60"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="mb-2 h-7 w-7 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {file ? (
              <p className="text-xs font-medium text-indigo-300">{file.name} ({formatBytes(file.size)})</p>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-300">Click to select a new PDF</p>
                <p className="text-xs text-slate-500">Max 10 MB · replaces the current file</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Text area */}
      {mode === 'text' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Report text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            rows={8}
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
            placeholder="Enter the full report text…"
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">{text.length} chars</p>
        </div>
      )}

      {mode === 'title-only' && (
        <p className="text-xs text-slate-500">Only the title will be updated. The existing file and AI summary are preserved.</p>
      )}

      {/* Footer buttons */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function DoctorReports() {
  const auth = getAuthUser();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  // Tracks a consultation whose DB report was deleted while the edit modal is open.
  // Row stays in the table until the modal closes. If the doctor uploads a new
  // report the ref is cleared; if they close without uploading the row is pruned.
  const deletedRowIdRef = useRef(null);

  const fetchReports = async () => {
    try {
      const res = await getDoctorReports();
      setReports(res.data?.data || []);
    } catch {
      toast.error('Failed to load reports');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const runForReport = useCallback(async (row, action) => {
    const rowId = resolveConsultationId(row);
    if (!rowId) { toast.error('Report id is missing'); return null; }
    setActiveReportId(rowId);
    try {
      const data = await action(rowId);
      setReports((prev) =>
        mergeReportRow(prev, rowId, {
          summaryStatus: 'Pending Approval',
          summary: data ? { _id: rowId, consultationId: rowId, ...data } : null,
        }),
      );
      if (String(selected?._id) === String(rowId)) setSummary(data);
      return data;
    } finally {
      setActiveReportId(null);
    }
  }, [selected?._id]);

  const handleRegenerate = async (row, event) => {
    event?.stopPropagation?.();
    const rowId = resolveConsultationId(row);
    if (activeReportId && String(activeReportId) !== String(rowId)) {
      toast.info('Another report is still processing — please wait');
      return;
    }
    // Open the modal immediately so the doctor sees the generating state.
    setSelected(row);
    setSummary(row.summary || null);
    try {
      const data = await runForReport(row, (id) => runRegenerateAISummary(id));
      if (data) toast.success('Summary regenerated for this report only');
    } catch (error) {
      toast.error(aiSummaryErrorMessage(error));
    }
  };

  const handleGenerate = async (row, event) => {
    event?.stopPropagation?.();
    const rowId = resolveConsultationId(row);
    if (activeReportId && String(activeReportId) !== String(rowId)) {
      toast.info('Another report is still processing — please wait');
      return;
    }
    // Open the modal immediately so the doctor sees the generating state.
    setSelected(row);
    setSummary(null);
    try {
      const data = await runForReport(row, async (id) => {
        const res = await generateAISummary(id);
        return res.data?.data ?? null;
      });
      if (data) toast.success('AI summary generated');
    } catch (error) {
      toast.error(
        error.response?.status === 503 ? 'AI service unavailable — try later' : 'Failed to generate summary',
      );
    }
  };

  const handleReplaceSaved = (updatedRow, summaryReset) => {
    // New report was saved — no need to prune the row when the modal closes.
    deletedRowIdRef.current = null;
    if (!updatedRow) return;
    const rowId = String(updatedRow._id || updatedRow.consultationId);
    const patch = {
      ...updatedRow,
      // Backend populates patientId, but fall back to the in-list row's value
      // in case of any serialisation mismatch.
      patientId: updatedRow.patientId?.name ? updatedRow.patientId : (editingReport?.patientId ?? updatedRow.patientId),
      summaryStatus: summaryReset ? 'Not Generated' : (updatedRow.summaryStatus || 'Not Generated'),
      summary: summaryReset ? null : updatedRow.summary,
    };
    setReports((prev) => {
      const exists = prev.some((r) => String(r._id) === rowId);
      if (exists) return mergeReportRow(prev, rowId, patch);
      return [patch, ...prev];
    });
  };

  const handleReportDeleted = (consultationId) => {
    setReports((prev) => prev.filter((r) => String(resolveConsultationId(r)) !== String(consultationId)));
  };

  // Closes the edit modal. If the doctor deleted the DB report but did NOT
  // upload a new one, prune the now-empty row from the table.
  const closeEditModal = () => {
    if (deletedRowIdRef.current) {
      handleReportDeleted(deletedRowIdRef.current);
      deletedRowIdRef.current = null;
    }
    setEditingReport(null);
  };


  const isRowBusy = (row) => {
    const id = resolveConsultationId(row);
    return id && String(activeReportId) === String(id);
  };

  return (
    <>
      <DoctorLayout title="Medical Reports" doctorName={auth.name}>
        <section className="glass-panel overflow-hidden rounded-2xl">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
              <tr>
                <th className="px-4 py-3">Report Title</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Summary Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 4 }}>No reports found</div>
                    <div style={{ fontSize: 12 }}>Medical reports from consultations will appear here.</div>
                  </td>
                </tr>
              ) : null}
              {reports.map((row) => {
                const busy = isRowBusy(row);
                return (
                  <tr key={row._id} className="border-b border-slate-800/60">
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3">{row.patientId?.name || '--'}</td>
                    <td className="px-4 py-3">{formatDateInPakistan(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 ${statusClass[row.summaryStatus] || statusClass['Not Generated']}`}>
                        {busy ? 'Generating…' : row.summaryStatus === 'Pending Approval' ? 'Awaiting Review' : row.summaryStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {/* Edit report file/title */}
                        <button
                          type="button"
                          className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300 hover:border-indigo-500/60 hover:text-indigo-300 disabled:opacity-40"
                          disabled={Boolean(activeReportId)}
                          onClick={(e) => { e.stopPropagation(); setEditingReport(row); }}
                          title="Edit or replace this report"
                        >
                          Edit
                        </button>

                        {/* View summary */}
                        <button
                          type="button"
                          className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200"
                          disabled={Boolean(activeReportId)}
                          onClick={() => { setSelected(row); setSummary(row.summary || null); }}
                        >
                          View
                        </button>

                        {row.summaryStatus === 'Not Generated' ? (
                          <button
                            type="button"
                            disabled={Boolean(activeReportId) && !busy}
                            className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100 disabled:opacity-50"
                            onClick={(e) => handleGenerate(row, e)}
                          >
                            {busy ? 'Generating…' : 'Generate Summary'}
                          </button>
                        ) : null}

                        {row.summaryStatus === 'Pending Approval' ? (
                          <button
                            type="button"
                            className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100"
                            disabled={Boolean(activeReportId)}
                            onClick={() => { setSelected(row); setSummary(row.summary || null); }}
                          >
                            Review
                          </button>
                        ) : null}

                        {['Pending Approval', 'Approved', 'Rejected'].includes(row.summaryStatus) ? (
                          <button
                            type="button"
                            disabled={Boolean(activeReportId) && !busy}
                            className="rounded-md border border-rose-300/25 px-2.5 py-1 text-[11px] text-rose-100 disabled:opacity-50"
                            onClick={(e) => handleRegenerate(row, e)}
                          >
                            {busy ? 'Regenerating…' : 'Re-generate'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </DoctorLayout>

      {/* AI Summary review modal */}
      {selected ? (
        <CareModal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="3xl">
          <AISummaryReview
            report={selected}
            summary={summary}
            generating={isRowBusy(selected)}
            onGenerate={async () => handleGenerate(selected)}
            onRejectRegenerate={async () => handleRegenerate(selected)}
            onApprove={async (editedSummary) => {
              const rowId = resolveConsultationId(selected);
              if (!summary?._id && !rowId) return;
              await approveAISummary(rowId, { summaryId: summary._id || rowId, editedSummary });
              toast.success('Summary approved — patient can now view');
              setReports((prev) =>
                mergeReportRow(prev, rowId, {
                  summaryStatus: 'Approved',
                  summary: { ...summary, simplifiedSummary: editedSummary, status: 'Approved' },
                }),
              );
              setSummary((prev) => ({ ...prev, simplifiedSummary: editedSummary, status: 'Approved' }));
            }}
          />
        </CareModal>
      ) : null}

      {/* Replace report modal */}
      {editingReport ? (
        <CareModal
          open={!!editingReport}
          onClose={closeEditModal}
          title="Edit Report"
          size="lg"
        >
          <ReplaceReportModal
            report={editingReport}
            onClose={closeEditModal}
            onSaved={handleReplaceSaved}
            onFileDeleted={(id) => { deletedRowIdRef.current = id; }}
          />
        </CareModal>
      ) : null}
    </>
  );
}

export default DoctorReports;

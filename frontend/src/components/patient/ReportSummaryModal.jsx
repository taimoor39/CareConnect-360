import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getPatientReportSummary } from '../../api/patientPortal.js';
import { formatDate, formatDateTime } from '../../utils/dateHelpers.js';
import { generateSummaryPDF } from '../../utils/generateSummaryPDF.js';

const DISCLAIMER =
  'This summary is for informational purposes only and does not constitute medical advice.';

function ReportSummaryModal({ open, reportId, patient, onClose }) {
  const [data, setData] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reportId) {
      setData(null);
      setForbidden(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const res = await getPatientReportSummary(reportId);
        if (!cancelled) setData(res.data?.data || null);
      } catch (e) {
        if (!cancelled) {
          if (e.response?.status === 403) {
            setForbidden(true);
            setData(null);
          } else {
            toast.error('Failed to load data');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reportId]);

  if (!open) return null;

  const downloadPdf = () => {
    if (!data) return;
    generateSummaryPDF({
      patientName: patient?.name,
      patientCode: patient?.patientId || patient?.patientCode,
      reportTitle: data.title,
      summaryText: data.simplifiedSummary,
      doctorName: data.doctorName,
      uploadedDate: formatDate(data.uploadedAt),
      disclaimer: DISCLAIMER,
    });
    toast.success('PDF downloaded');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 pt-10 backdrop-blur-sm sm:pt-16"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mb-10 w-full max-w-[700px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="pr-4 text-lg font-semibold text-white">{data?.title || 'Report summary'}</h2>
          <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5">
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-50/95">
            {DISCLAIMER}
          </div>

          {loading ? <p className="mt-6 text-slate-400">Loading…</p> : null}

          {forbidden && !loading ? (
            <p className="mt-6 text-sm text-slate-300">This summary is not yet available. Your doctor is reviewing it.</p>
          ) : null}

          {!loading && data ? (
            <>
              <div className="mt-6 space-y-1 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Doctor: </span>Dr. {data.doctorName}
                </p>
                <p>
                  <span className="text-slate-500">Date uploaded: </span>
                  {formatDate(data.uploadedAt)}
                </p>
                <p>
                  <span className="text-slate-500">Approved: </span>
                  {data.approvedByName ? `Dr. ${data.approvedByName}` : '—'}
                  {data.approvedAt ? ` on ${formatDateTime(data.approvedAt)}` : ''}
                </p>
              </div>

              <p className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-teal-300">Your health summary</p>
              <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-950/50 p-5 text-base leading-[1.8] text-slate-100">
                {data.simplifiedSummary}
              </div>

              {data.medicalTermsExplained?.length ? (
                <details className="mt-6 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-teal-200">Medical terms explained</summary>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                    {data.medicalTermsExplained.map((row, i) => (
                      <li key={i}>
                        {row.term} = {row.plain}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950"
                >
                  Download summary PDF
                </button>
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-200">
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ReportSummaryModal;

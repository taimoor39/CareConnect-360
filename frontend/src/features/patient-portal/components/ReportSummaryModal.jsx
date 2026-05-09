import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getPatientReportSummary } from '@/api/patientPortal.js';
import CareModal from '@/shared/components/CareModal.jsx';
import { formatDate, formatDateTime } from '@/utils/dateHelpers.js';
import { generateSummaryPDF } from '@/utils/generateSummaryPDF.js';

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
    <CareModal
      open={open}
      onClose={onClose}
      title={data?.title || 'Report summary'}
      size="wide"
      alignTop
      footer={
        !loading && data ? (
          <>
            <button type="button" onClick={downloadPdf} className="care-btn-primary">
              Download summary PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
            >
              Close
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            Close
          </button>
        )
      }
    >
      <div className="rounded-[var(--radius-md)] border border-teal-500/35 bg-teal-500/[0.07] p-4 text-sm leading-relaxed text-teal-50/95">
        {DISCLAIMER}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <div className="skeleton h-4 w-full max-w-xs" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : null}

      {forbidden && !loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">This summary is not yet available. Your doctor is reviewing it.</p>
      ) : null}

      {!loading && data ? (
        <>
          <div className="mt-6 space-y-1 text-sm text-[var(--text-secondary)]">
            <p>
              <span className="text-[var(--text-muted)]">Doctor: </span>Dr. {data.doctorName}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Date uploaded: </span>
              {formatDate(data.uploadedAt)}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Approved: </span>
              {data.approvedByName ? `Dr. ${data.approvedByName}` : '—'}
              {data.approvedAt ? ` on ${formatDateTime(data.approvedAt)}` : ''}
            </p>
          </div>

          <p className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--teal-light)]">Your health summary</p>
          <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5 text-base leading-[1.8] text-[var(--text-primary)]">
            {data.simplifiedSummary}
          </div>

          {data.medicalTermsExplained?.length ? (
            <details className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-teal-200">Medical terms explained</summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
                {data.medicalTermsExplained.map((row, i) => (
                  <li key={i}>
                    {row.term} = {row.plain}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </CareModal>
  );
}

export default ReportSummaryModal;

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { downloadPatientReportPDF, getPatientReportSummary } from '@/api/patientPortal.js';
import CareModal from '@/shared/components/CareModal.jsx';
import { formatDate, formatDateTime } from '@/utils/dateHelpers.js';
import { generateSummaryPDF } from '@/utils/generateSummaryPDF.js';

const DISCLAIMER =
  'This summary is for informational purposes only and does not constitute medical advice.';

const SUMMARY_PENDING_COPY = {
  'Not Generated':
    'Your doctor has uploaded this report. A simplified summary has not been generated yet. You can still view or download the original report below.',
  'Pending Approval':
    'Your doctor is reviewing the AI-generated summary. The original report is available below; the simplified summary will appear once approved.',
  Rejected:
    'The simplified summary for this report is not available. You can still view or download the original report below.',
};

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportSummaryModal({ open, reportId, patient, onClose }) {
  const [data, setData] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
          if (e.response?.status === 403 || e.response?.status === 404) {
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

  const downloadSummaryPdf = () => {
    if (!data?.simplifiedSummary?.trim()) return;
    generateSummaryPDF({
      patientName: patient?.name,
      patientCode: patient?.patientId || patient?.patientCode,
      reportTitle: data.title,
      summaryText: data.simplifiedSummary,
      doctorName: data.doctorName,
      uploadedDate: formatDate(data.uploadedAt),
      disclaimer: DISCLAIMER,
    });
    toast.success('Summary PDF downloaded');
  };

  const downloadOriginalPdf = async () => {
    if (!reportId) return;
    setDownloadingPdf(true);
    try {
      const res = await downloadPatientReportPDF(reportId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const filename =
        data?.pdfName ||
        `${String(data?.title || 'medical-report').replace(/[^\w.\-() ]+/g, '_')}.pdf`;
      triggerBlobDownload(blob, filename);
      toast.success('Report PDF downloaded');
    } catch {
      toast.error('Could not download report PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const showOriginalPdfDownload = data?.hasPdfDownload || data?.fileType === 'pdf';
  const showSummaryDownload = Boolean(data?.simplifiedSummary?.trim());
  const showApprovedSummary = data?.summaryStatus === 'Approved' && Boolean(data?.simplifiedSummary?.trim());
  const showOriginalText = Boolean(data?.originalText?.trim());
  const pendingCopy = SUMMARY_PENDING_COPY[data?.summaryStatus];

  return (
    <CareModal
      open={open}
      onClose={onClose}
      title={data?.title || 'Medical report'}
      size="wide"
      alignTop
      footer={
        !loading && data ? (
          <div className="flex flex-wrap justify-end gap-2">
            {showOriginalPdfDownload ? (
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={downloadOriginalPdf}
                className="care-btn-primary"
              >
                {downloadingPdf ? 'Downloading…' : 'Download report PDF'}
              </button>
            ) : null}
            {showSummaryDownload ? (
              <button type="button" onClick={downloadSummaryPdf} className="care-btn-view">
                Download summary PDF
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]"
            >
              Close
            </button>
          </div>
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
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid rgba(217,119,6,0.2)',
          borderRadius: 8,
          fontSize: 13,
          color: '#fbbf24',
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        ⚠️ {DISCLAIMER} Always consult with your healthcare provider.
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <div className="skeleton h-4 w-full max-w-xs" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : null}

      {(forbidden || (!loading && !data)) && !loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">This report is not available.</p>
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
            {showApprovedSummary ? (
              <p>
                <span className="text-[var(--text-muted)]">Summary approved: </span>
                {data.approvedByName ? `Dr. ${data.approvedByName}` : '—'}
                {data.approvedAt ? ` on ${formatDateTime(data.approvedAt)}` : ''}
              </p>
            ) : null}
          </div>

          {pendingCopy ? (
            <p className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              {pendingCopy}
            </p>
          ) : null}

          {showOriginalText ? (
            <>
              <p className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--teal-light)]">
                Original report
              </p>
              <div className="mt-3 whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5 text-base leading-[1.8] text-[var(--text-primary)]">
                {data.originalText}
              </div>
            </>
          ) : null}

          {showApprovedSummary ? (
            <>
              <p className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--teal-light)]">
                Your health summary
              </p>
              <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5 text-base leading-[1.8] text-[var(--text-primary)]">
                {data.simplifiedSummary}
              </div>
            </>
          ) : null}

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

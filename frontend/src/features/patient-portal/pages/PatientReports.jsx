import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyReports } from '@/api/patientPortal.js';
import PatientPaginationBar from '@features/patient-portal/components/PatientPaginationBar.jsx';
import ReportSummaryModal from '@features/patient-portal/components/ReportSummaryModal.jsx';
import Card from '@/shared/components/Card.jsx';
import { formatDate } from '@/utils/dateHelpers.js';

function ReportsEmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: '#64748b',
      }}
    >
      <svg
        style={{ marginBottom: 16, opacity: 0.4 }}
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#94a3b8',
          marginBottom: 4,
        }}
      >
        No reports available yet
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Your doctor will share medical reports here after your visit is completed
      </div>
    </div>
  );
}

const SUMMARY_STATUS_LABEL = {
  Approved: 'Summary approved',
  'Pending Approval': 'Summary pending review',
  Rejected: 'Summary not available',
  'Not Generated': 'Summary not yet generated',
};

function PatientReports() {
  const { patient } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyReports({ page, limit: 10 });
      setRows(res.data?.data?.reports || []);
      setPagination(res.data?.data?.pagination || { total: 0, pages: 1, limit: 10 });
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card
        padding="14px 18px"
        style={{
          borderLeft: '3px solid var(--teal)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <p className="m-0 text-xs leading-relaxed text-[var(--text-muted)]">
          Medical reports uploaded by your doctor appear here. You can download PDF reports or read text reports anytime. A simplified health summary is shown only after your doctor has reviewed and approved it.
        </p>
      </Card>

      {loading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-32 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-32 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Card padding="0">
          <ReportsEmptyState />
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r._id} padding="20px 22px">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{r.title || 'Report'}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Uploaded {r.uploadedAt ? formatDate(r.uploadedAt) : '—'}
              {r.doctorName ? ` · Dr. ${r.doctorName}` : ''}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {SUMMARY_STATUS_LABEL[r.summaryStatus] || r.summaryStatus || 'Report on file'}
            </p>
            <button type="button" onClick={() => setOpenId(r.reportId)} className="care-btn-primary mt-4">
              View report →
            </button>
          </Card>
        ))}
      </div>

      {!loading && rows.length > 0 ? (
        <PatientPaginationBar
          page={pagination.page || page}
          pages={pagination.pages || 1}
          total={pagination.total || 0}
          limit={pagination.limit || 10}
          onPageChange={setPage}
        />
      ) : null}

      <ReportSummaryModal open={!!openId} reportId={openId} patient={patient} onClose={() => setOpenId(null)} />
    </div>
  );
}

export default PatientReports;

import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyReports } from '@/api/patientPortal.js';
import PatientPaginationBar from '@features/patient-portal/components/PatientPaginationBar.jsx';
import EmptyState, { EmptyStateIconInbox } from '@/shared/components/EmptyState.jsx';
import ReportSummaryModal from '@features/patient-portal/components/ReportSummaryModal.jsx';
import Badge from '@/shared/components/Badge.jsx';
import Card from '@/shared/components/Card.jsx';
import { formatDate } from '@/utils/dateHelpers.js';

const statusMeta = {
  Approved: { badge: 'approved', label: 'Approved summary' },
  'Pending Approval': { badge: 'pending', label: 'Summary pending review' },
  Rejected: { badge: 'missed', label: 'Summary being revised' },
  'Not Generated': { badge: 'scheduled', label: 'Report on file' },
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
          Your medical reports from completed visits appear here. When your doctor approves an AI summary, it will be shown alongside the report.
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
          <EmptyState
            icon={<EmptyStateIconInbox />}
            title="No reports available yet"
            subtitle="Reports uploaded by your doctor during a consultation will appear here."
          />
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const meta = statusMeta[r.summaryStatus] || statusMeta['Not Generated'];
          const isApproved = r.summaryStatus === 'Approved';
          return (
            <Card key={r._id} padding="20px 22px">
              <div className="flex flex-wrap items-center gap-2">
                <Badge type={meta.badge} label={meta.label} />
                {r.fileType === 'pdf' ? (
                  <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">PDF</span>
                ) : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{r.title || 'Report'}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Uploaded {r.uploadedAt ? formatDate(r.uploadedAt) : '—'}
                {r.doctorName ? ` · Dr. ${r.doctorName}` : ''}
                {isApproved && r.approvedByName ? ` · Approved by Dr. ${r.approvedByName}` : ''}
                {isApproved && r.approvedAt ? ` · ${formatDate(r.approvedAt)}` : ''}
              </p>
              {!isApproved ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {r.fileType === 'text'
                    ? 'You can view the report text now. A simplified summary may be added after your doctor reviews it.'
                    : 'Open this report to download the PDF uploaded by your doctor.'}
                </p>
              ) : null}
              <button type="button" onClick={() => setOpenId(r.reportId)} className="care-btn-primary mt-4">
                {isApproved ? 'View summary →' : 'View report →'}
              </button>
            </Card>
          );
        })}
      </div>

      <PatientPaginationBar
        page={pagination.page || page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />

      <ReportSummaryModal open={!!openId} reportId={openId} patient={patient} onClose={() => setOpenId(null)} />
    </div>
  );
}

export default PatientReports;

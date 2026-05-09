import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyAppointments, getMyPrescriptions, getMyReports } from '@/api/patientPortal.js';
import QRCodeModal from '@features/patient-portal/components/QRCodeModal.jsx';
import PatientPaginationBar from '@features/patient-portal/components/PatientPaginationBar.jsx';
import EmptyState, { EmptyStateIconCalendar } from '@/shared/components/EmptyState.jsx';
import Badge from '@/shared/components/Badge.jsx';
import Card from '@/shared/components/Card.jsx';
import { formatDate, formatTimeSlot } from '@/utils/dateHelpers.js';
import { formatDateInPakistan, parseLocalDateFromISO } from '@/utils/isoDate.js';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'missed', label: 'Missed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function PatientAppointments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [rows, setRows] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });
  const [qrAppt, setQrAppt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prRes, rpRes] = await Promise.all([
        getMyPrescriptions({ limit: 200, page: 1 }).catch(() => ({ data: { data: { prescriptions: [] } } })),
        getMyReports({ limit: 200, page: 1 }).catch(() => ({ data: { data: { reports: [] } } })),
      ]);
      setPrescriptions(prRes.data?.data?.prescriptions || []);
      setReports(rpRes.data?.data?.reports || []);

      const params = { page, limit: 10 };
      if (tab === 'upcoming') {
        params.upcoming = true;
      } else if (tab !== 'all') {
        params.status = tab.charAt(0).toUpperCase() + tab.slice(1);
      }

      const apRes = await getMyAppointments(params);
      setRows(apRes.data?.data?.appointments || []);
      setPagination(apRes.data?.data?.pagination || { total: 0, pages: 1, limit: 10 });
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const list = rows;

  const hasPrescription = (appointmentId) =>
    prescriptions.some(
      (p) => String(p.consultationId?.appointmentId?._id || p.consultationId?.appointmentId) === String(appointmentId),
    );

  const hasApprovedReport = (appointmentId) =>
    reports.some((r) => r.appointmentId && String(r.appointmentId) === String(appointmentId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t.id ? 'bg-teal-500 text-slate-950' : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-teal-500/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-28 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-28 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {!loading && list.length === 0 ? (
          <Card padding="0">
            <EmptyState
              icon={<EmptyStateIconCalendar />}
              title="No appointments yet"
              subtitle="Contact reception to schedule your visit."
            />
          </Card>
        ) : null}
        {list.map((a) => (
          <Card key={a._id} padding="20px 22px">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] pb-4">
              <span className="text-sm text-[var(--text-muted)]">{formatDate(a.date)}</span>
              <Badge type={a.status} label={a.status} />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">Dr. {a.doctorId?.name || '—'}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {a.doctorProfile?.specialization || a.doctorId?.specialization || '—'} ·{' '}
                  {a.doctorProfile?.qualification || a.doctorId?.qualification || '—'}
                </p>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatDateInPakistan(parseLocalDateFromISO(a.date) || a.date, 'en-GB', { weekday: 'long' })},{' '}
                {formatDate(a.date)}
              </p>
              <p className="text-sm text-[var(--teal-light)]">{formatTimeSlot(a.timeSlot)}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Reason: {a.reasonForVisit?.trim() || 'General consultation'}
              </p>
              {a.consultation ? (
                <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--teal-light)]">
                    Visit notes (from your doctor)
                  </p>
                  {a.consultation.symptoms?.trim() ? (
                    <p className="mt-2 text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Symptoms: </span>
                      {a.consultation.symptoms}
                    </p>
                  ) : null}
                  {a.consultation.diagnosis?.trim() ? (
                    <p className="mt-2 text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Diagnosis: </span>
                      {a.consultation.diagnosis}
                    </p>
                  ) : null}
                  {a.consultation.consultationNotes?.trim() ? (
                    <p className="mt-2 text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Notes: </span>
                      {a.consultation.consultationNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                {a.status === 'Scheduled' ? (
                  <button type="button" onClick={() => setQrAppt(a)} className="care-btn-primary-sm">
                    View QR code
                  </button>
                ) : null}
                {a.status === 'Completed' && hasPrescription(a._id) ? (
                  <button type="button" onClick={() => navigate('/patient/prescriptions')} className="care-btn-view">
                    View prescription
                  </button>
                ) : null}
                {a.status === 'Completed' && hasApprovedReport(a._id) ? (
                  <button type="button" onClick={() => navigate('/patient/reports')} className="care-btn-primary-sm">
                    View report
                  </button>
                ) : null}
                {a.status === 'Missed' ? (
                  <span className="inline-flex items-center rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                    Contact reception to reschedule
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PatientPaginationBar
        page={pagination.page || page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />

      <QRCodeModal open={!!qrAppt} appointment={qrAppt} onClose={() => setQrAppt(null)} />
    </div>
  );
}

export default PatientAppointments;

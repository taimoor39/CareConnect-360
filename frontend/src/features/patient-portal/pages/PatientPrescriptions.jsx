import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getPublicSettings } from '@/api/settings.js';
import { getMyPrescriptions } from '@/api/patientPortal.js';
import PatientPaginationBar from '@features/patient-portal/components/PatientPaginationBar.jsx';
import EmptyState, { EmptyStateIconInbox } from '@/shared/components/EmptyState.jsx';
import Card from '@/shared/components/Card.jsx';
import { formatDate } from '@/utils/dateHelpers.js';
import { generatePrescriptionPDF } from '@/utils/generatePrescriptionPDF.js';

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-teal-300" aria-hidden="true">
    <path
      d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

function PatientPrescriptions() {
  const [rows, setRows] = useState([]);
  const [clinicName, setClinicName] = useState('CareConnect 360');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, pub] = await Promise.all([
        getMyPrescriptions({ page, limit: 10 }),
        getPublicSettings().catch(() => ({ data: {} })),
      ]);
      setRows(pr.data?.data?.prescriptions || []);
      setPagination(pr.data?.data?.pagination || { total: 0, pages: 1, limit: 10 });
      setClinicName(pub.data?.data?.clinicName || 'CareConnect 360');
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const printPdf = (rx, patientLite) => {
    const apptDate = rx.consultationId?.appointmentId?.date;
    const follow = rx.consultationId?.followUpDate;
    generatePrescriptionPDF({
      patient: patientLite,
      doctor: {
        name: rx.doctorId?.name,
        specialization: rx.doctorProfile?.specialization || rx.doctorId?.specialization,
      },
      prescription: {
        items: rx.items,
        followUpDate: follow ? formatDate(follow) : null,
      },
      appointmentDate: apptDate ? formatDate(apptDate) : formatDate(rx.createdAt),
      clinicName,
    });
    toast.success('PDF downloaded');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {loading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-36 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-36 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : null}
      {!loading && rows.length === 0 ? (
        <Card padding="0">
          <EmptyState icon={<EmptyStateIconInbox />} title="No prescriptions yet" subtitle="Your doctor will add prescriptions after visits." />
        </Card>
      ) : null}
      {rows.map((rx) => {
        const appt = rx.consultationId?.appointmentId;
        const patientLite = {
          name: rx.patientId?.name,
          patientId: rx.patientId?.patientId,
          patientCode: rx.patientId?.patientCode,
          age: rx.patientId?.dateOfBirth ? calcAge(rx.patientId.dateOfBirth) : null,
        };
        return (
          <Card key={rx._id} padding="0">
            <div style={{ padding: '18px 22px 0' }}>
              <p className="text-xs text-[var(--text-muted)]">Prescribed: {formatDate(rx.createdAt)}</p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                Dr. {rx.doctorId?.name || '—'} — {rx.doctorProfile?.specialization || rx.doctorId?.specialization || '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Appointment: {appt?.date ? formatDate(appt.date) : '—'}
              </p>
            </div>
            <div
              style={{
                margin: '16px 0 0',
                padding: '14px 22px 18px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal-light)]">Medicines</p>
              <ul className="mt-3 divide-y divide-[rgba(255,255,255,0.06)]">
                {(rx.items || []).map((item, idx) => (
                  <li key={idx} className="py-3 text-sm first:pt-0 last:pb-0">
                    <p className="font-medium text-[var(--text-primary)]">
                      {idx + 1}. {item.medicineName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Dosage: {item.dosage} · Frequency: {item.frequency} · Duration: {item.duration}
                    </p>
                    {item.instructions ? (
                      <p className="mt-1 text-xs font-light text-[var(--text-muted)]">{item.instructions}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            {rx.consultationId?.followUpDate ? (
              <div style={{ padding: '0 22px 12px' }} className="text-xs text-sky-200/90">
                Follow-up: {formatDate(rx.consultationId.followUpDate)}
              </div>
            ) : null}
            <div style={{ padding: '0 22px 20px' }}>
              <button
                type="button"
                onClick={() => printPdf(rx, patientLite)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-teal-500/35 bg-transparent px-4 py-2 text-xs font-semibold text-teal-200 transition hover:border-teal-400/55 hover:bg-teal-500/10"
              >
                <PdfIcon />
                Print / Download PDF
              </button>
            </div>
          </Card>
        );
      })}

      <PatientPaginationBar
        page={pagination.page || page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />
    </div>
  );
}

export default PatientPrescriptions;

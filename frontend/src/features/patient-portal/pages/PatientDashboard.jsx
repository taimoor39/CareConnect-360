import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPatientDashboard } from '@/api/patientPortal.js';
import QRCodeModal from '@features/patient-portal/components/QRCodeModal.jsx';
import Badge from '@/shared/components/Badge.jsx';
import Card from '@/shared/components/Card.jsx';
import StatCard from '@/shared/components/StatCard.jsx';
import { formatDate, formatTimeSlot } from '@/utils/dateHelpers.js';

function greetingKarachi() {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const hour = Number.parseInt(hourStr, 10);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function PatientDashboard() {
  const { patient } = useOutletContext();
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getPatientDashboard();
      setDash(res.data?.data || null);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pi = dash?.patientInfo || {};
  const displayName = useMemo(
    () =>
      patient?.name ||
      `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() ||
      String(pi.name || 'Patient').trim(),
    [patient, pi.name],
  );
  const first = patient?.firstName || String(displayName).split(/\s+/)[0] || 'Patient';
  const code = pi.patientId || patient?.patientId || patient?.patientCode || null;
  const age = pi.age != null ? pi.age : null;
  const blood = pi.bloodGroup || patient?.bloodGroup || null;
  const statusLabel = patient?.status || pi.status || 'Active';

  const initials = useMemo(
    () =>
      String(displayName)
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'P',
    [displayName],
  );

  const upcoming = dash?.upcoming ?? 0;
  const prescriptionCount = dash?.prescriptions ?? 0;
  const reportsReady = dash?.reports ?? 0;
  const next = dash?.nextAppointment;
  const spec = next?.doctorProfile?.specialization || next?.doctorSpecialization;
  const qual = next?.doctorProfile?.qualification || next?.doctorQualification;
  const allergiesList = Array.isArray(pi.allergies) ? pi.allergies.filter(Boolean) : [];
  const allergiesText = allergiesList.length ? allergiesList.join(', ') : 'None recorded';
  const ec = dash?.emergencyContact || {};

  const bloodLine = blood ? `Blood: ${blood}` : 'Blood: not on file';
  const ageLine = age != null ? `Age: ${age}` : 'Age: not on file';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        style={{
          background:
            'linear-gradient(135deg, rgba(17,30,48,0.96) 0%, rgba(7,13,26,0.94) 55%, rgba(13,21,37,0.92) 100%)',
          boxShadow: 'var(--shadow-card)',
          padding: '22px 26px 22px 28px',
        }}
      >
        <div
          className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-[var(--radius-lg)] bg-gradient-to-b from-teal-400 to-teal-700"
          aria-hidden="true"
        />
        <div className="pl-4">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            {greetingKarachi()}, {first}{' '}
            <span aria-hidden="true">
              👋
            </span>
          </h2>
          <p className="mt-1 text-sm font-light text-[var(--text-muted)]">Here is your health overview</p>
          <div className="my-5 h-px bg-[var(--border)]" />

          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-slate-950 shadow-md ring-2 ring-teal-500/35"
              style={{
                background: 'linear-gradient(145deg, #5eead4 0%, #0d9488 100%)',
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-base font-semibold text-[var(--text-primary)]">{displayName}</span>
                {code ? (
                  <span className="font-mono text-xs text-[var(--text-muted)]">{code}</span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">Patient ID pending</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
                <span>{bloodLine}</span>
                <span className="hidden text-[var(--border)] sm:inline">·</span>
                <span>{ageLine}</span>
                <span className="hidden text-[var(--border)] sm:inline">·</span>
                <span className="inline-flex items-center gap-2">
                  Status:
                  <Badge type={String(statusLabel).toLowerCase()} label={statusLabel} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <StatCard
            label="Upcoming appointments"
            value={loading ? '—' : upcoming}
            sub="Scheduled visits"
            valueColor="var(--teal-light)"
            onClick={() => navigate('/patient/appointments')}
          />
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <StatCard
            label="Prescriptions"
            value={loading ? '—' : prescriptionCount}
            sub="On file"
            valueColor="#60a5fa"
            onClick={() => navigate('/patient/prescriptions')}
          />
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <StatCard
            label="Reports ready"
            value={loading ? '—' : reportsReady}
            sub="Approved summaries"
            valueColor="#4ade80"
            onClick={() => navigate('/patient/reports')}
          />
        </div>
      </div>

      {!next ? (
        <Card title="Next appointment">
          <div className="py-6 text-center">
            <p className="text-3xl" aria-hidden="true">
              📅
            </p>
            <p className="mt-3 text-sm text-[var(--text-primary)]">No upcoming appointments</p>
            <p className="mt-1 text-xs font-light text-[var(--text-muted)]">Contact reception to book your visit</p>
          </div>
        </Card>
      ) : (
        <Card
          title="Next appointment"
          action={<Badge type={next.status} label={next.status} />}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-6">
            <div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                {new Intl.DateTimeFormat('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Karachi',
                }).format(new Date(next.date))}
              </p>
              <p className="mt-1 text-sm text-[var(--teal-light)]">{formatTimeSlot(next.timeSlot)}</p>
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="text-[var(--text-primary)]">
                Dr. {next.doctorId?.name || '—'}{' '}
                <span className="font-normal text-[var(--text-muted)]">· {spec || '—'}</span>
              </p>
              {qual ? <p className="mt-1 text-xs text-[var(--text-muted)]">{qual}</p> : null}
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Reason: {next.reasonForVisit?.trim() || 'General consultation'}
          </p>
          {next.status === 'Scheduled' ? (
            <button type="button" onClick={() => setQrOpen(true)} className="care-btn-primary mt-5">
              View QR code
            </button>
          ) : null}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card title="Quick links">
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/patient/appointments" className="text-teal-300 hover:text-teal-200">
                My appointments →
              </Link>
            </li>
            <li>
              <Link to="/patient/prescriptions" className="text-teal-300 hover:text-teal-200">
                My prescriptions →
              </Link>
            </li>
            <li>
              <Link to="/patient/reports" className="text-teal-300 hover:text-teal-200">
                My reports →
              </Link>
            </li>
            <li>
              <Link to="/patient/invoices" className="text-teal-300 hover:text-teal-200">
                My invoices →
              </Link>
            </li>
          </ul>
        </Card>

        <Card title="Health summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Blood group</dt>
              <dd className="text-right text-[var(--text-secondary)]">{blood || 'Not on file'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Allergies</dt>
              <dd className="max-w-[14rem] text-right text-[var(--text-secondary)]">{allergiesText}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Last visit</dt>
              <dd className="text-right text-[var(--text-secondary)]">
                {dash?.lastVisitDate ? formatDate(dash.lastVisitDate) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Registered</dt>
              <dd className="text-right text-[var(--text-secondary)]">
                {dash?.registeredAt ? formatDate(dash.registeredAt) : '—'}
              </dd>
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <dt className="text-[var(--text-muted)]">Emergency</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                {ec.name || '—'}
                {ec.phone ? ` · ${ec.phone}` : ''}
              </dd>
              {ec.relation ? <dd className="text-xs text-[var(--text-muted)]">{ec.relation}</dd> : null}
            </div>
          </dl>
          <Link to="/patient/profile" className="mt-6 inline-block text-sm font-medium text-teal-300 hover:text-teal-200">
            Update profile →
          </Link>
        </Card>
      </div>

      <QRCodeModal open={qrOpen} appointment={next} onClose={() => setQrOpen(false)} />
    </div>
  );
}

export default PatientDashboard;

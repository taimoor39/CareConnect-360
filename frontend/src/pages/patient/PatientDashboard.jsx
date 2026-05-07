import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPatientDashboard } from '../../api/patientPortal.js';
import QRCodeModal from '../../components/patient/QRCodeModal.jsx';
import { formatDate, formatTimeSlot } from '../../utils/dateHelpers.js';

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
  const first = patient?.firstName || String(pi.name || patient?.name || 'Patient').split(/\s+/)[0];
  const code = pi.patientId || patient?.patientId || patient?.patientCode || '—';
  const age = pi.age != null ? pi.age : null;
  const upcoming = dash?.upcoming ?? 0;
  const prescriptionCount = dash?.prescriptions ?? 0;
  const reportsReady = dash?.reports ?? 0;
  const next = dash?.nextAppointment;
  const spec = next?.doctorProfile?.specialization || next?.doctorSpecialization;
  const qual = next?.doctorProfile?.qualification || next?.doctorQualification;
  const allergiesList = Array.isArray(pi.allergies) ? pi.allergies.filter(Boolean) : [];
  const allergiesText = allergiesList.length ? allergiesList.join(', ') : '—';
  const ec = dash?.emergencyContact || {};

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-xl sm:p-8">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-700" aria-hidden="true" />
        <div className="pl-5 sm:flex sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome back, {first}</h2>
            <p className="mt-2 text-sm text-slate-400">Here is your health summary</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="font-mono text-slate-400">{code}</span>
              <span>|</span>
              <span>Blood group: {pi.bloodGroup || patient?.bloodGroup || '—'}</span>
              <span>|</span>
              <span>Age: {age != null ? age : '—'}</span>
            </div>
          </div>
          <div className="mt-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-2xl font-semibold text-slate-950 sm:mt-0">
            {String(pi.name || patient?.name || 'P')
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/patient/appointments')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-left transition hover:border-teal-500/40 hover:bg-slate-900/70"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Upcoming appointments</p>
          <p className="mt-2 text-3xl font-semibold text-teal-300">{loading ? '—' : upcoming}</p>
          <p className="mt-1 text-xs text-slate-500">Scheduled visits</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/prescriptions')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-left transition hover:border-sky-500/40 hover:bg-slate-900/70"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Prescriptions</p>
          <p className="mt-2 text-3xl font-semibold text-sky-300">{loading ? '—' : prescriptionCount}</p>
          <p className="mt-1 text-xs text-slate-500">On file</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/reports')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-left transition hover:border-emerald-500/40 hover:bg-slate-900/70"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Reports ready</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{loading ? '—' : reportsReady}</p>
          <p className="mt-1 text-xs text-slate-500">Approved summaries</p>
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Next appointment</h3>
        <div className="mt-4 border-t border-slate-800/80 pt-4">
          {!next ? (
            <div className="py-8 text-center">
              <p className="text-4xl" aria-hidden="true">
                📋
              </p>
              <p className="mt-3 text-slate-300">No appointments yet.</p>
              <p className="mt-1 text-sm text-slate-500">Contact reception to schedule a visit.</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-white">
                {new Intl.DateTimeFormat('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Karachi',
                }).format(new Date(next.date))}
              </p>
              <p className="mt-1 text-teal-200/90">{formatTimeSlot(next.timeSlot)}</p>
              <div className="mt-4 text-sm text-slate-300">
                <p className="text-base font-medium text-white">
                  Dr. {next.doctorId?.name || '—'} <span className="font-normal text-slate-400">· {spec || '—'}</span>
                </p>
                {qual ? <p className="mt-1 text-slate-400">{qual}</p> : null}
              </div>
              <p className="mt-4 text-sm text-slate-400">
                <span className="text-slate-500">Reason: </span>
                {next.reasonForVisit?.trim() || 'General consultation'}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                <span className="text-slate-500">Status: </span>
                <span className="text-teal-300">● {next.status}</span>
              </p>
              {next.status === 'Scheduled' ? (
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="mt-5 rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950"
                >
                  View QR code
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Quick links</h3>
          <ul className="mt-4 space-y-2 text-sm">
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
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Health summary</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Blood group</dt>
              <dd className="text-right text-slate-200">{pi.bloodGroup || patient?.bloodGroup || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Allergies</dt>
              <dd className="max-w-[12rem] text-right text-slate-200">{allergiesText}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last visit</dt>
              <dd className="text-right text-slate-200">{dash?.lastVisitDate ? formatDate(dash.lastVisitDate) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Registered</dt>
              <dd className="text-right text-slate-200">{dash?.registeredAt ? formatDate(dash.registeredAt) : '—'}</dd>
            </div>
            <div className="border-t border-slate-800/80 pt-3">
              <dt className="text-slate-500">Emergency</dt>
              <dd className="mt-1 text-slate-200">
                {ec.name || '—'}
                {ec.phone ? ` · ${ec.phone}` : ''}
              </dd>
              {ec.relation ? <dd className="text-xs text-slate-500">{ec.relation}</dd> : null}
            </div>
          </dl>
          <Link to="/patient/profile" className="mt-6 inline-block text-sm font-medium text-teal-300 hover:text-teal-200">
            Update profile →
          </Link>
        </section>
      </div>

      <QRCodeModal open={qrOpen} appointment={next} onClose={() => setQrOpen(false)} />
    </div>
  );
}

export default PatientDashboard;

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyAppointments, getMyPrescriptions, getMyReports } from '../../api/patientPortal.js';
import QRCodeModal from '../../components/patient/QRCodeModal.jsx';
import PatientPaginationBar from '../../components/patient/PatientPaginationBar.jsx';
import { formatDate, formatTimeSlot } from '../../utils/dateHelpers.js';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'missed', label: 'Missed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function statusBadge(status) {
  const map = {
    Scheduled: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
    Completed: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    Missed: 'bg-amber-500/15 text-amber-100 ring-amber-400/30',
    Cancelled: 'bg-slate-600/40 text-slate-300 ring-slate-500/30',
    'Checked-In': 'bg-teal-500/15 text-teal-100 ring-teal-400/30',
    'In-Progress': 'bg-violet-500/15 text-violet-100 ring-violet-400/30',
  };
  return map[status] || map.Scheduled;
}

function PatientAppointments() {
  useOutletContext();
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
              tab === t.id ? 'bg-teal-500 text-slate-950' : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-teal-500/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-400">Loading…</p> : null}

      <div className="space-y-4">
        {!loading && list.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            No appointments yet. Contact reception to schedule a visit.
          </p>
        ) : null}
        {list.map((a) => (
          <article key={a._id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusBadge(a.status)}`}>{a.status}</span>
              <span className="text-sm text-slate-400">{formatDate(a.date)}</span>
            </div>
            <div className="mt-4 border-t border-slate-800/60 pt-4">
              <p className="text-lg font-semibold text-white">Dr. {a.doctorId?.name || '—'}</p>
              <p className="mt-1 text-sm text-slate-400">
                {a.doctorProfile?.specialization || a.doctorId?.specialization || '—'} · {a.doctorProfile?.qualification || a.doctorId?.qualification || '—'}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                {new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Asia/Karachi' }).format(new Date(a.date))}, {formatDate(a.date)}
              </p>
              <p className="mt-1 text-sm text-teal-200/90">{formatTimeSlot(a.timeSlot)}</p>
              <p className="mt-3 text-sm text-slate-400">
                Reason: {a.reasonForVisit?.trim() || 'General consultation'}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {a.status === 'Scheduled' ? (
                <button
                  type="button"
                  onClick={() => setQrAppt(a)}
                  className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
                >
                  View QR code
                </button>
              ) : null}
              {a.status === 'Completed' && hasPrescription(a._id) ? (
                <button type="button" onClick={() => navigate('/patient/prescriptions')} className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100">
                  View prescription
                </button>
              ) : null}
              {a.status === 'Completed' && hasApprovedReport(a._id) ? (
                <button type="button" onClick={() => navigate('/patient/reports')} className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
                  View report
                </button>
              ) : null}
              {a.status === 'Missed' ? (
                <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100">
                  Contact reception to reschedule
                </span>
              ) : null}
            </div>
          </article>
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

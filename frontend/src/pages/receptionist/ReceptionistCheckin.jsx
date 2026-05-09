import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getAppointments } from '../../api/appointments.js';
import { checkInByImage, checkInByQR, manualCheckIn } from '../../api/receptionist.js';
import CheckInLog from '../../components/receptionist/CheckInLog.jsx';
import CheckInResult from '../../components/receptionist/CheckInResult.jsx';
import QRScanner from '../../components/receptionist/QRScanner.jsx';
import QRUploader from '../../components/receptionist/QRUploader.jsx';
import ReceptionistLayout from '@/shared/layouts/ReceptionistLayout.jsx';
import { todayPKT } from '../../utils/isoDate.js';

function mapCheckinError(error) {
  if (!error?.response) {
    toast.error('Check-in failed — network error');
    toast.info('Please use upload or manual check-in below');
    return;
  }
  const msg = String(error.response?.data?.message || '');
  const status = error.response.status;
  if (status === 404 || /invalid qr/i.test(msg)) {
    toast.error('Invalid QR code');
    return;
  }
  if (/no qr code/i.test(msg)) {
    toast.error('No QR code detected in image — try a clearer photo');
    return;
  }
  if (/already checked in/i.test(msg)) {
    toast.warning('Already checked in');
    return;
  }
  if (/not for today|not scheduled for today/i.test(msg)) {
    toast.warning("Not today's appointment");
    return;
  }
  if (/cancelled/i.test(msg)) {
    toast.warning(msg || 'Appointment was cancelled');
    return;
  }
  toast.error(msg || 'Check-in failed');
}

const TABS = [
  { id: 'camera', label: 'Camera scan' },
  { id: 'upload', label: 'Upload image' },
  { id: 'manual', label: 'Manual entry' },
];

const cardClass = 'glass-panel rounded-2xl p-5';

function ReceptionistCheckin() {
  const [tab, setTab] = useState('camera');
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [checkinLog, setCheckinLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);

  const fetchLog = useCallback(async () => {
    try {
      setLogLoading(true);
      const [checkedInRes, totalRes] = await Promise.all([
        getAppointments({
          date: todayPKT(),
          status: 'Checked-In',
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }),
        getAppointments({
          date: todayPKT(),
          limit: 1,
          sortBy: 'date',
          sortOrder: 'asc',
        }),
      ]);
      setCheckinLog(checkedInRes.data?.data?.appointments || []);
      setTodayTotal(Number(totalRes.data?.data?.pagination?.total ?? 0));
    } catch {
      setCheckinLog([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const finalizeOk = useCallback(
    async (appt) => {
      const name = appt?.patientId?.name || 'Patient';
      setResult({ ok: true, appointment: appt });
      toast.success(`${name} checked in`, { autoClose: 5000 });
      setManualCode('');
      await fetchLog();
      setTimeout(() => setResult((current) => (current?.ok ? null : current)), 6000);
    },
    [fetchLog],
  );

  const runCheckIn = useCallback(
    async (rawCode) => {
      const code = String(rawCode || '').trim();
      if (!code) return;
      setBusy(true);
      try {
        let appt;
        if (/^[a-f\d]{24}$/i.test(code)) {
          const res = await manualCheckIn(code);
          appt = res.data?.data;
        } else {
          const res = await checkInByQR(code);
          appt = res.data?.data;
        }
        await finalizeOk(appt);
      } catch (error) {
        mapCheckinError(error);
        setResult({ ok: false, message: error.response?.data?.message || 'Check-in failed' });
      } finally {
        setBusy(false);
      }
    },
    [finalizeOk],
  );

  const runImageCheckIn = useCallback(
    async (file) => {
      setBusy(true);
      try {
        const res = await checkInByImage(file);
        const appt = res.data?.data?.appointment;
        await finalizeOk(appt);
        return true;
      } catch (error) {
        mapCheckinError(error);
        setResult({ ok: false, message: error.response?.data?.message || 'Check-in failed' });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [finalizeOk],
  );

  const manualSubmit = () => runCheckIn(manualCode);

  const checkedInCount = checkinLog.length;
  const remaining = useMemo(
    () => Math.max(0, todayTotal - checkedInCount),
    [todayTotal, checkedInCount],
  );

  return (
    <ReceptionistLayout
      title="QR Check-In"
      subline="Scan, upload or paste an appointment QR to mark a patient as arrived."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className={cardClass}>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">TODAY&apos;S APPOINTMENTS</p>
          <p className="mt-2 text-2xl font-semibold text-teal-300">{logLoading ? '—' : todayTotal}</p>
          <p className="mt-1 text-xs text-slate-400">All bookings scheduled for today</p>
        </article>
        <article className={cardClass}>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">CHECKED IN</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{logLoading ? '—' : checkedInCount}</p>
          <p className="mt-1 text-xs text-slate-400">Patients arrived and waiting</p>
        </article>
        <article className={cardClass}>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">AWAITING ARRIVAL</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{logLoading ? '—' : remaining}</p>
          <p className="mt-1 text-xs text-slate-400">Yet to check in for today</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-1">
            <div role="tablist" aria-label="Check-in method" className="grid grid-cols-3 gap-1">
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {tab === 'camera' ? <QRScanner onDecoded={runCheckIn} disabled={busy} /> : null}
          {tab === 'upload' ? <QRUploader onUpload={runImageCheckIn} disabled={busy} /> : null}
          {tab === 'manual' ? (
            <section className="glass-panel overflow-hidden rounded-2xl">
              <div className="border-b border-slate-800 px-4 py-3">
                <h2 className="text-base font-semibold text-white">Manual check-in</h2>
                <p className="text-xs text-slate-400">
                  Paste the QR payload or enter the 24-character appointment ID if the camera and upload both fail.
                </p>
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') manualSubmit();
                    }}
                    placeholder="QR string or appointment ID…"
                    className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-300/60 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                  <button
                    type="button"
                    onClick={manualSubmit}
                    disabled={busy || !manualCode.trim()}
                    className="h-9 shrink-0 rounded-md bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Check in
                  </button>
                </div>
                <p className="mt-3 text-[0.6875rem] text-slate-400">
                  Tip: paste a QR payload from email/SMS, or enter the appointment ID from the booking confirmation.
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <section className="glass-panel overflow-hidden rounded-2xl">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-base font-semibold text-white">Check-in result</h2>
            <p className="text-xs text-slate-400">Live feedback for the most recent scan, upload or manual entry.</p>
          </div>
          <div className="p-4">
            <CheckInResult result={result} onDismiss={() => setResult(null)} />
          </div>
        </section>
      </section>

      <CheckInLog rows={checkinLog} loading={logLoading} />
    </ReceptionistLayout>
  );
}

export default ReceptionistCheckin;

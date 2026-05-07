import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getAppointments } from '../../api/appointments.js';
import { checkInByQR, manualCheckIn } from '../../api/receptionist.js';
import CheckInLog from '../../components/receptionist/CheckInLog.jsx';
import CheckInResult from '../../components/receptionist/CheckInResult.jsx';
import QRScanner from '../../components/receptionist/QRScanner.jsx';
import ReceptionistLayout from '../../components/receptionist/ReceptionistLayout.jsx';
import { todayPKT } from '../../utils/isoDate.js';

function mapCheckinError(error) {
  if (!error?.response) {
    toast.error('Check-in failed — network error');
    toast.info('Please use manual check-in below');
    return;
  }
  const msg = String(error.response?.data?.message || '');
  const status = error.response.status;
  if (status === 404 || /invalid qr/i.test(msg)) {
    toast.error('Invalid QR code');
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

function ReceptionistCheckin() {
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [checkinLog, setCheckinLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [scanDisabled, setScanDisabled] = useState(false);

  const fetchLog = useCallback(async () => {
    try {
      setLogLoading(true);
      const res = await getAppointments({
        date: todayPKT(),
        status: 'Checked-In',
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setCheckinLog(res.data?.data?.appointments || []);
    } catch {
      setCheckinLog([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const runCheckIn = useCallback(
    async (rawCode) => {
      const code = String(rawCode || '').trim();
      if (!code) return;
      setScanDisabled(true);
      try {
        let appt;
        if (/^[a-f\d]{24}$/i.test(code)) {
          const res = await manualCheckIn(code);
          appt = res.data?.data;
        } else {
          const res = await checkInByQR(code);
          appt = res.data?.data;
        }
        const name = appt?.patientId?.name || 'Patient';
        setResult({ ok: true, appointment: appt });
        toast.success(`${name} checked in`, { autoClose: 5000 });
        setManualCode('');
        await fetchLog();
        setTimeout(() => {
          setResult(null);
        }, 5000);
      } catch (error) {
        mapCheckinError(error);
        setResult({ ok: false, message: error.response?.data?.message || 'Check-in failed' });
      } finally {
        setScanDisabled(false);
      }
    },
    [fetchLog],
  );

  const manualSubmit = () => runCheckIn(manualCode);

  return (
    <ReceptionistLayout title="QR Check-In">
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <QRScanner onDecoded={runCheckIn} disabled={scanDisabled} />
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Manual check-in</p>
            <p className="mt-1 text-xs text-slate-400">
              Paste the QR payload, or enter the 24-character appointment ID if the camera is blocked.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="QR string or appointment ID…"
                className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={manualSubmit}
                disabled={scanDisabled}
                className="h-9 shrink-0 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 disabled:opacity-50"
              >
                Check in
              </button>
            </div>
          </div>
        </div>

        <article className="glass-panel rounded-2xl p-4">
          <CheckInResult result={result} onDismiss={() => setResult(null)} />
        </article>
      </section>

      <CheckInLog rows={checkinLog} loading={logLoading} />
    </ReceptionistLayout>
  );
}

export default ReceptionistCheckin;

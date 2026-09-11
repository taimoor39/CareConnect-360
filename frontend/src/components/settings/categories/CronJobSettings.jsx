import { useState } from 'react';
import { toast } from 'react-toastify';

import { sendScheduledJobTestEmail } from '../../../api/settings.js';
import CareModal from '@/shared/components/CareModal.jsx';
import { formatDateTime } from '../../../utils/dateHelpers.js';
import SettingsSection from '../shared/SettingsSection.jsx';
import ToggleSwitch from '../shared/ToggleSwitch.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const JOBS = [
  ['appointmentReminder', 'Appointment Reminder Emails', 'Sends reminders 24hrs before appointments', false, true],
  ['missedAppointmentDetector', 'Missed Appointment Detector', 'Marks unattended appointments as Missed, then emails the patient', true, true],
  ['patientReEngagement', 'Patient Re-engagement Check', 'Identifies patients inactive 6+ months', false, true],
  ['prescriptionRenewal', 'Prescription Renewal Alerts', 'Alerts for prescriptions due in 7 days', false, true],
  ['aiSummaryReady', 'AI Summary Availability', 'Emails patients when an approved report summary is ready', true, true],
];

function CronJobSettings({ data, cronUi, onCronUiChange, onToggle, onSave, onRunNow, dirty, saving, logs }) {
  const [testTarget, setTestTarget] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testError, setTestError] = useState('');
  const [testSending, setTestSending] = useState(false);

  const openTest = (key, name) => {
    setTestTarget({ key, name });
    setTestEmail('');
    setTestError('');
  };

  const closeTest = () => {
    if (testSending) return;
    setTestTarget(null);
    setTestEmail('');
    setTestError('');
  };

  const submitTest = async (event) => {
    event?.preventDefault?.();
    const to = String(testEmail || '').trim();
    if (!to) {
      setTestError('Email is required');
      return;
    }
    if (!EMAIL_RE.test(to)) {
      setTestError('Enter a valid email address');
      return;
    }
    setTestSending(true);
    setTestError('');
    try {
      const res = await sendScheduledJobTestEmail(testTarget.key, to);
      toast.success(res.data?.message || `Test email sent to ${to}`);
      setTestTarget(null);
      setTestEmail('');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send test email';
      setTestError(message);
      toast.error(message);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <SettingsSection title="Scheduled Jobs" subtitle="Automated engagement and maintenance tasks">
      <div className="grid gap-3 md:grid-cols-2">
        {JOBS.map(([key, name, desc, fixed, canTest]) => (
          <div key={key} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <p className="text-sm text-white">{name}</p>
            <p className="text-[11px] text-slate-400">{desc}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={fixed ? 'text-amber-200' : (data?.[key]?.enabled ? 'text-emerald-200' : 'text-slate-400')}>
                {fixed ? 'Running (fixed)' : (data?.[key]?.enabled ? 'Running' : 'Disabled')}
              </span>
              {!fixed ? <ToggleSwitch checked={Boolean(data?.[key]?.enabled)} onChange={(v) => onToggle(key, v)} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onRunNow(key, name)} className="rounded border border-amber-300/30 px-2 py-1 text-xs text-amber-100">Run Now</button>
              {canTest ? (
                <button type="button" onClick={() => openTest(key, name)} className="rounded border border-sky-400/40 px-2 py-1 text-xs text-sky-100">
                  Send test email
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {['appointmentReminder', 'patientReEngagement', 'prescriptionRenewal'].map((key) => (
          <div key={key} className="grid items-center gap-2 rounded border border-slate-700 bg-slate-900/40 p-2 md:grid-cols-[1fr_auto_auto_auto]">
            <p className="text-xs text-slate-200">{key}</p>
            <select value={cronUi[key]?.hour || '9'} onChange={(e) => onCronUiChange(key, { ...(cronUi[key] || {}), hour: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs">{Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select>
            <select value={cronUi[key]?.minute || '00'} onChange={(e) => onCronUiChange(key, { ...(cronUi[key] || {}), minute: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs">{['00', '15', '30', '45'].map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select value={cronUi[key]?.ampm || 'AM'} onChange={(e) => onCronUiChange(key, { ...(cronUi[key] || {}), ampm: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs"><option>AM</option><option>PM</option></select>
          </div>
        ))}
      </div>
      <button type="button" onClick={onSave} disabled={!dirty || saving} className="mt-3 rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save Job Schedules'}</button>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-2 py-1 text-left">Job</th><th className="px-2 py-1 text-left">Run At</th><th className="px-2 py-1 text-left">Records</th></tr></thead>
          <tbody>{logs.map((r) => <tr key={r._id} className="border-t border-slate-800"><td className="px-2 py-1 text-slate-200">{r.action}</td><td className="px-2 py-1 text-slate-300">{formatDateTime(r.createdAt)}</td><td className="px-2 py-1 text-slate-300">{r.details?.sent != null ? `sent ${r.details.sent} / failed ${r.details.failed ?? 0}` : (r.details?.modifiedCount ?? '-')}</td></tr>)}</tbody>
        </table>
      </div>

      <CareModal
        open={Boolean(testTarget)}
        onClose={closeTest}
        title={testTarget ? `Send test email — ${testTarget.name}` : 'Send test email'}
        footer={(
          <>
            <button type="button" onClick={closeTest} disabled={testSending} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="cron-test-email-form" disabled={testSending} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 disabled:opacity-50">
              {testSending ? 'Sending…' : 'Send test email'}
            </button>
          </>
        )}
      >
        <form id="cron-test-email-form" onSubmit={submitTest}>
          <p className="mb-3 text-xs text-slate-400">
            The <span className="text-slate-200">{testTarget?.name}</span> template will be sent to this address with sample data. The subject is prefixed with [TEST].
          </p>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Recipient email
            <input
              type="email"
              autoFocus
              autoComplete="email"
              value={testEmail}
              onChange={(e) => {
                setTestEmail(e.target.value);
                if (testError) setTestError('');
              }}
              placeholder="name@example.com"
              className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none focus:border-teal-400/50"
            />
          </label>
          {testError ? <p className="mt-2 text-[11px] text-rose-300">{testError}</p> : null}
        </form>
      </CareModal>
    </SettingsSection>
  );
}

export default CronJobSettings;

import { formatDateTime } from '../../../utils/dateHelpers.js';
import SettingsSection from '../shared/SettingsSection.jsx';
import ToggleSwitch from '../shared/ToggleSwitch.jsx';

function CronJobSettings({ data, cronUi, onCronUiChange, onToggle, onSave, onRunNow, dirty, saving, logs }) {
  const jobs = [
    ['appointmentReminder', 'Appointment Reminder Emails', 'Sends reminders 24hrs before appointments', false],
    ['missedAppointmentDetector', 'Missed Appointment Detector', 'Marks unattended appointments as Missed', true],
    ['patientReEngagement', 'Patient Re-engagement Check', 'Identifies patients inactive 6+ months', false],
    ['prescriptionRenewal', 'Prescription Renewal Alerts', 'Alerts for prescriptions due in 7 days', false],
  ];
  return (
    <SettingsSection title="Scheduled Jobs" subtitle="Automated engagement and maintenance tasks">
      <div className="grid gap-3 md:grid-cols-2">
        {jobs.map(([key, name, desc, fixed]) => (
          <div key={key} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <p className="text-sm text-white">{name}</p>
            <p className="text-[11px] text-slate-400">{desc}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={fixed ? 'text-amber-200' : (data?.[key]?.enabled ? 'text-emerald-200' : 'text-slate-400')}>
                {fixed ? 'Running (fixed)' : (data?.[key]?.enabled ? 'Running' : 'Disabled')}
              </span>
              {!fixed ? <ToggleSwitch checked={Boolean(data?.[key]?.enabled)} onChange={(v) => onToggle(key, v)} /> : null}
            </div>
            {!fixed ? <button type="button" onClick={() => onRunNow(key, name)} className="mt-2 rounded border border-amber-300/30 px-2 py-1 text-xs text-amber-100">Run Now</button> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {['appointmentReminder', 'patientReEngagement', 'prescriptionRenewal'].map((key) => (
          <div key={key} className="grid items-center gap-2 rounded border border-slate-700 bg-slate-900/40 p-2 md:grid-cols-[1fr_auto_auto_auto]">
            <p className="text-xs text-slate-200">{key}</p>
            <select value={cronUi[key].hour} onChange={(e) => onCronUiChange(key, { ...cronUi[key], hour: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs">{Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select>
            <select value={cronUi[key].minute} onChange={(e) => onCronUiChange(key, { ...cronUi[key], minute: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs">{['00', '15', '30', '45'].map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select value={cronUi[key].ampm} onChange={(e) => onCronUiChange(key, { ...cronUi[key], ampm: e.target.value })} className="h-9 rounded border border-slate-700 bg-slate-950 px-2 text-xs"><option>AM</option><option>PM</option></select>
          </div>
        ))}
      </div>
      <button type="button" onClick={onSave} disabled={!dirty || saving} className="mt-3 rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save Job Schedules'}</button>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-2 py-1 text-left">Job</th><th className="px-2 py-1 text-left">Run At</th><th className="px-2 py-1 text-left">Records</th></tr></thead>
          <tbody>{logs.map((r) => <tr key={r._id} className="border-t border-slate-800"><td className="px-2 py-1 text-slate-200">{r.action}</td><td className="px-2 py-1 text-slate-300">{formatDateTime(r.createdAt)}</td><td className="px-2 py-1 text-slate-300">{r.details?.modifiedCount ?? '-'}</td></tr>)}</tbody>
        </table>
      </div>
    </SettingsSection>
  );
}

export default CronJobSettings;

import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';
import ToggleSwitch from '../shared/ToggleSwitch.jsx';

function GeneralSettings({ data, errors, onChange, onSave, dirty, saving }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <SettingsSection title="General & Security Settings" subtitle="Authentication and system-wide configuration">
      <div className="grid gap-3 md:grid-cols-2">
        <SettingsField label="Token Expiry Duration" error={errors.jwtExpiryHours} helper="Users will be logged out after this many hours of inactivity">
          <input type="number" min={1} max={720} value={data.jwtExpiryHours ?? ''} onChange={(e) => set('jwtExpiryHours', e.target.value)} onBlur={(e) => { const n = parseInt(e.target.value); set('jwtExpiryHours', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
        <SettingsField label="Minimum Password Length" error={errors.minPasswordLength}>
          <input type="number" min={6} max={32} value={data.minPasswordLength ?? ''} onChange={(e) => set('minPasswordLength', e.target.value)} onBlur={(e) => { const n = parseInt(e.target.value); set('minPasswordLength', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
        <SettingsField label="Password Expiry (days)">
          <input type="number" min={0} value={data.passwordExpiryDays ?? ''} onChange={(e) => set('passwordExpiryDays', e.target.value)} onBlur={(e) => { const n = parseInt(e.target.value); set('passwordExpiryDays', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
        <SettingsField label="Max Login Attempts" error={errors.maxLoginAttempts}>
          <input type="number" min={3} max={10} value={data.maxLoginAttempts ?? ''} onChange={(e) => set('maxLoginAttempts', e.target.value)} onBlur={(e) => { const n = parseInt(e.target.value); set('maxLoginAttempts', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
        <SettingsField label="File Upload Size Limit (MB)" error={errors.fileUploadLimitMB}>
          <input type="number" min={1} max={50} value={data.fileUploadLimitMB ?? ''} onChange={(e) => set('fileUploadLimitMB', e.target.value)} onBlur={(e) => { const n = parseInt(e.target.value); set('fileUploadLimitMB', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
        <SettingsField label="Allowed Frontend Origin" error={errors.corsAllowedOrigin} helper="Use * for development only">
          <input value={data.corsAllowedOrigin || ''} onChange={(e) => set('corsAllowedOrigin', e.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" />
        </SettingsField>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {[
          ['refreshTokenEnabled', 'Enable Refresh Tokens'],
          ['requireUppercase', 'Require Uppercase Letter'],
          ['requireNumber', 'Require Number'],
          ['requireSpecialChar', 'Require Special Character'],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200">
            <span>{label}</span>
            <ToggleSwitch checked={Boolean(data[key])} onChange={(v) => set(key, v)} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onSave} disabled={!dirty || saving} className="rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-amber-300">Restart server for changes to apply.</p>
    </SettingsSection>
  );
}

export default GeneralSettings;

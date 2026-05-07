import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';
import ToggleSwitch from '../shared/ToggleSwitch.jsx';

function AIServiceSettings({ data, errors, dirty, saving, health, healthLoading, onChange, onSave, onCheckHealth }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const tone = health?.status === 'online' ? 'border-emerald-400/40 bg-emerald-500/10' : health?.status === 'slow' ? 'border-amber-400/40 bg-amber-500/10' : 'border-rose-400/40 bg-rose-500/10';

  return (
    <SettingsSection title="AI Service Configuration" subtitle="Medical report summarization settings">
      <div className={`rounded-lg border p-3 text-sm ${tone}`}>
        <p>AI Service Status: {health?.status || 'unknown'}</p>
        <p>Response time: {health?.responseMs ?? '-'}ms</p>
        <p>Last checked: {health ? 'just now' : 'not checked'}</p>
        <button type="button" onClick={onCheckHealth} disabled={healthLoading} className="mt-2 rounded border border-sky-300/30 px-2 py-1 text-xs text-sky-100">{healthLoading ? 'Checking...' : 'Check Now'}</button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <SettingsField label="AI Service URL" error={errors.url}><input value={data.url || ''} onChange={(e) => set('url', e.target.value.replace(/\/+$/, ''))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="Request Timeout (seconds)" error={errors.timeoutSeconds}><input type="number" min={5} max={120} value={data.timeoutSeconds ?? 30} onChange={(e) => set('timeoutSeconds', Number(e.target.value || 0))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="Max Report Length" error={errors.maxReportLength}><input type="number" min={500} max={50000} value={data.maxReportLength ?? 10000} onChange={(e) => set('maxReportLength', Number(e.target.value || 0))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200"><span>AI Summarization Enabled</span><ToggleSwitch checked={Boolean(data.enabled)} onChange={(v) => set('enabled', v)} /></div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200"><span>Auto-summarize on Upload</span><ToggleSwitch checked={Boolean(data.autoSummarize)} onChange={(v) => set('autoSummarize', v)} /></div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200"><span>Require Doctor Approval (locked)</span><ToggleSwitch checked onChange={() => {}} disabled /></div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200"><span>Show Disclaimer (locked)</span><ToggleSwitch checked onChange={() => {}} disabled /></div>
      </div>
      <button type="button" onClick={onSave} disabled={!dirty || saving} className="mt-3 rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save AI Service Settings'}</button>
    </SettingsSection>
  );
}

export default AIServiceSettings;

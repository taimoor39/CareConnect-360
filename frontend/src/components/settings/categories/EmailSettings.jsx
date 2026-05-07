import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';
import EmailTemplates from './EmailTemplates.jsx';

function EmailSettings({
  data,
  errors,
  dirty,
  saving,
  smtpStatus,
  smtpTesting,
  onChange,
  onSave,
  onTest,
  templates,
  onTemplateChange,
  onSaveTemplate,
  savingTemplate,
}) {
  const configured = data.smtpHost && data.smtpPort && data.smtpUser && data.fromName && data.fromEmail && (data.smtpPassConfigured || data.smtpPass);
  return (
    <SettingsSection title="Email Configuration" subtitle="SMTP settings and notification templates">
      <p className="text-xs text-slate-300">Status: {configured ? <span className="text-emerald-300">Configured</span> : <span className="text-amber-300">Not Configured</span>}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <SettingsField label="SMTP Host" error={errors.smtpHost}><input value={data.smtpHost || ''} onChange={(e) => onChange({ ...data, smtpHost: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="SMTP Port" error={errors.smtpPort}><input type="number" value={data.smtpPort || 587} onChange={(e) => onChange({ ...data, smtpPort: Number(e.target.value || 0) })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="SMTP Username" error={errors.smtpUser}><input value={data.smtpUser || ''} onChange={(e) => onChange({ ...data, smtpUser: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="SMTP Password" error={errors.smtpPass}>
          <input
            type="password"
            value={data.smtpPass || ''}
            onChange={(e) => onChange({ ...data, smtpPass: e.target.value })}
            placeholder={data.smtpPassConfigured ? 'Saved (leave blank to keep existing)' : 'Enter SMTP password'}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm"
          />
        </SettingsField>
        <SettingsField label="Encryption"><select value={data.smtpEncryption || 'tls'} onChange={(e) => onChange({ ...data, smtpEncryption: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm"><option value="none">None</option><option value="ssl">SSL</option><option value="tls">TLS</option></select></SettingsField>
        <SettingsField label="From Name" error={errors.fromName}><input value={data.fromName || ''} onChange={(e) => onChange({ ...data, fromName: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="From Email" error={errors.fromEmail}><input value={data.fromEmail || ''} onChange={(e) => onChange({ ...data, fromEmail: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="Reply-To Email" error={errors.replyTo}><input value={data.replyTo || ''} onChange={(e) => onChange({ ...data, replyTo: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onSave} disabled={!dirty || saving} className="rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save Email Settings'}</button>
        <button type="button" onClick={onTest} disabled={smtpTesting} className="rounded border border-sky-300/30 px-3 py-2 text-xs text-sky-100">{smtpTesting ? 'Testing...' : 'Test Email Connection'}</button>
      </div>
      {smtpStatus ? <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${smtpStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{smtpStatus.message}</p> : null}
      <EmailTemplates templates={templates} onChange={onTemplateChange} onSaveTemplate={onSaveTemplate} savingTemplate={savingTemplate} />
    </SettingsSection>
  );
}

export default EmailSettings;

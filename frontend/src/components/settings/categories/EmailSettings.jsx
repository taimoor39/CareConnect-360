import { useState } from 'react';
import { PasswordInput } from '@/shared/components/PasswordField.jsx';
import CareModal from '@/shared/components/CareModal.jsx';

import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';
import EmailTemplates from './EmailTemplates.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testError, setTestError] = useState('');

  const configured = data.smtpHost && data.smtpPort && data.smtpUser && data.fromName && data.fromEmail && (data.smtpPassConfigured || data.smtpPass);

  const closeTest = () => {
    if (smtpTesting) return;
    setTestOpen(false);
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
    setTestError('');
    try {
      await onTest?.(to);
      setTestOpen(false);
      setTestEmail('');
    } catch (err) {
      const message = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to send test email';
      setTestError(message);
    }
  };

  return (
    <SettingsSection title="Email Configuration" subtitle="SMTP settings and notification templates">
      <p className="text-xs text-slate-300">Status: {configured ? <span className="text-emerald-300">Configured</span> : <span className="text-amber-300">Not Configured</span>}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <SettingsField label="SMTP Host" error={errors.smtpHost}><input value={data.smtpHost || ''} onChange={(e) => onChange({ ...data, smtpHost: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="SMTP Port" error={errors.smtpPort}><input type="number" min={1} max={65535} value={data.smtpPort ?? ''} onChange={(e) => onChange({ ...data, smtpPort: e.target.value })} onBlur={(e) => { const n = parseInt(e.target.value, 10); onChange({ ...data, smtpPort: Number.isNaN(n) ? 587 : n }); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100" /></SettingsField>
        <SettingsField label="SMTP Username" error={errors.smtpUser}><input value={data.smtpUser || ''} onChange={(e) => onChange({ ...data, smtpUser: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="SMTP Password" error={errors.smtpPass}>
          <PasswordInput
            autoComplete="new-password"
            value={data.smtpPass || ''}
            onChange={(e) => onChange({ ...data, smtpPass: e.target.value })}
            placeholder={data.smtpPassConfigured ? 'Saved (leave blank to keep existing)' : 'Enter SMTP password'}
            size="compact"
            inputClassName="bg-slate-900/80"
          />
        </SettingsField>
        <SettingsField label="Encryption"><select value={data.smtpEncryption || 'tls'} onChange={(e) => onChange({ ...data, smtpEncryption: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm"><option value="none">None</option><option value="ssl">SSL</option><option value="tls">TLS</option></select></SettingsField>
        <SettingsField label="From Name" error={errors.fromName}><input value={data.fromName || ''} onChange={(e) => onChange({ ...data, fromName: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="From Email" error={errors.fromEmail}><input value={data.fromEmail || ''} onChange={(e) => onChange({ ...data, fromEmail: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
        <SettingsField label="Reply-To Email" error={errors.replyTo}><input value={data.replyTo || ''} onChange={(e) => onChange({ ...data, replyTo: e.target.value })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" /></SettingsField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onSave} disabled={!dirty || saving} className="rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save Email Settings'}</button>
        <button type="button" onClick={() => { setTestOpen(true); setTestEmail(''); setTestError(''); }} disabled={smtpTesting} className="rounded border border-sky-300/30 px-3 py-2 text-xs text-sky-100">{smtpTesting ? 'Testing...' : 'Test Email Connection'}</button>
      </div>
      {smtpStatus ? <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${smtpStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{smtpStatus.message}</p> : null}
      <EmailTemplates templates={templates} onChange={onTemplateChange} onSaveTemplate={onSaveTemplate} savingTemplate={savingTemplate} />

      <CareModal
        open={testOpen}
        onClose={closeTest}
        title="Test email connection"
        footer={(
          <>
            <button type="button" onClick={closeTest} disabled={smtpTesting} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="smtp-test-email-form" disabled={smtpTesting} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 disabled:opacity-50">
              {smtpTesting ? 'Sending…' : 'Send test email'}
            </button>
          </>
        )}
      >
        <form id="smtp-test-email-form" onSubmit={submitTest}>
          <p className="mb-3 text-xs text-slate-400">
            Enter the address that should receive the SMTP connection test. This does not use the logged-in admin email.
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

export default EmailSettings;

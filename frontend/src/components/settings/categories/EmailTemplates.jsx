import { useState } from 'react';
import { toast } from 'react-toastify';

import { sendScheduledJobTestEmail } from '../../../api/settings.js';
import CareModal from '@/shared/components/CareModal.jsx';
import EmailPreviewModal from '../shared/EmailPreviewModal.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEMPLATE_META = {
  appointmentReminder: { name: 'Appointment Reminder', variables: '{patientName} {doctorName} {date} {time} {clinicName}' },
  missedAppointment: { name: 'Missed Appointment', variables: '{patientName} {date} {rescheduleLink}' },
  prescriptionRenewal: { name: 'Prescription Renewal', variables: '{patientName} {doctorName} {medicationList} {renewalDate}' },
  reEngagement: { name: 'Re-engagement', variables: '{patientName} {lastVisitDate} {clinicName} {bookingLink}' },
  aiSummaryReady: { name: 'AI Summary Available', variables: '{patientName} {reportTitle} {portalLink}' },
};

function EmailTemplates({ templates, onChange, onSaveTemplate, savingTemplate }) {
  const [open, setOpen] = useState('');
  const [preview, setPreview] = useState('');
  const [testTarget, setTestTarget] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testError, setTestError] = useState('');
  const [testSending, setTestSending] = useState(false);

  const openTest = (key) => {
    setTestTarget({ key, name: TEMPLATE_META[key]?.name || key });
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
      toast.success(res.data?.message || `Test ${testTarget.name} email sent to ${to}`);
      setTestTarget(null);
      setTestEmail('');
    } catch (err) {
      const message = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to send test email';
      setTestError(message);
      toast.error(message);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold text-white">Email templates</p>
      <p className="text-[11px] text-slate-400">Edit copy, preview, or send a sample of each type to a test address.</p>
      {Object.entries(TEMPLATE_META).map(([key, m]) => (
        <div key={key} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white">{m.name}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreview(key)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Preview</button>
              <button type="button" onClick={() => openTest(key)} className="rounded border border-sky-400/40 px-2 py-1 text-[11px] text-sky-100">Send test email</button>
              <button type="button" onClick={() => setOpen((p) => (p === key ? '' : key))} className="rounded border border-teal-300/30 px-2 py-1 text-[11px] text-teal-100">{open === key ? 'Close' : 'Edit'}</button>
            </div>
          </div>
          {open === key ? (
            <div className="mt-2 space-y-2">
              <input value={templates?.[key]?.subject || ''} onChange={(e) => onChange(key, 'subject', e.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm" />
              <textarea rows={4} value={templates?.[key]?.body || ''} onChange={(e) => onChange(key, 'body', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm" />
              <p className="text-[11px] text-slate-500">Variables: {m.variables}</p>
              <button type="button" onClick={() => onSaveTemplate(key)} disabled={savingTemplate} className="rounded border border-teal-300/30 px-2 py-1 text-xs text-teal-100">{savingTemplate ? 'Saving...' : 'Save Template'}</button>
            </div>
          ) : null}
        </div>
      ))}
      <EmailPreviewModal
        open={Boolean(preview)}
        title={`Email Preview — ${TEMPLATE_META[preview]?.name || ''}`}
        subject={templates?.[preview]?.subject || ''}
        body={templates?.[preview]?.body || ''}
        onClose={() => setPreview('')}
      />

      <CareModal
        open={Boolean(testTarget)}
        onClose={closeTest}
        title={testTarget ? `Send test email — ${testTarget.name}` : 'Send test email'}
        footer={(
          <>
            <button type="button" onClick={closeTest} disabled={testSending} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="template-test-email-form" disabled={testSending} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 disabled:opacity-50">
              {testSending ? 'Sending…' : 'Send test email'}
            </button>
          </>
        )}
      >
        <form id="template-test-email-form" onSubmit={submitTest}>
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
    </div>
  );
}

export default EmailTemplates;

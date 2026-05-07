import { useState } from 'react';

import EmailPreviewModal from '../shared/EmailPreviewModal.jsx';

function EmailTemplates({ templates, onChange, onSaveTemplate, savingTemplate }) {
  const [open, setOpen] = useState('');
  const [preview, setPreview] = useState('');

  const meta = {
    appointmentReminder: { name: 'Appointment Reminder', variables: '{patientName} {doctorName} {date} {time} {clinicName}' },
    missedAppointment: { name: 'Missed Appointment', variables: '{patientName} {date} {rescheduleLink}' },
    prescriptionRenewal: { name: 'Prescription Renewal', variables: '{patientName} {doctorName} {medicationList} {renewalDate}' },
    reEngagement: { name: 'Re-engagement', variables: '{patientName} {lastVisitDate} {clinicName} {bookingLink}' },
    aiSummaryReady: { name: 'AI Summary Available', variables: '{patientName} {reportTitle} {portalLink}' },
  };

  return (
    <div className="mt-4 space-y-2">
      {Object.entries(meta).map(([key, m]) => (
        <div key={key} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white">{m.name}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(key)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Preview</button>
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
        title={`Email Preview — ${meta[preview]?.name || ''}`}
        subject={templates?.[preview]?.subject || ''}
        body={templates?.[preview]?.body || ''}
        onClose={() => setPreview('')}
      />
    </div>
  );
}

export default EmailTemplates;

/**
 * Built-in engagement email copy. Used when SystemSettings templates have an empty body
 * (common on existing DBs because schema defaults stored subject-only).
 */
export const DEFAULT_ENGAGEMENT_TEMPLATES = {
  appointmentReminder: {
    subject: 'Reminder: Your appointment tomorrow at {time}',
    body: `
              <h2 style="color:#1e293b;">Appointment Reminder</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">This is a friendly reminder that you have an appointment scheduled for tomorrow.</p>
              <div style="background:#f8fafc; border-left:4px solid #0d9488; padding:16px; margin:20px 0; border-radius:4px;">
                <p style="margin:4px 0; color:#1e293b;"><strong>Doctor:</strong> Dr. {doctorName}</p>
                <p style="margin:4px 0; color:#1e293b;"><strong>Date:</strong> {date}</p>
                <p style="margin:4px 0; color:#1e293b;"><strong>Time:</strong> {time}</p>
              </div>
              <p style="color:#475569;">Please arrive 10 minutes early. Bring this email or your QR code for check-in.</p>
              <p style="color:#475569;">If you need to reschedule, please contact reception at <strong>{clinicPhone}</strong></p>
            `,
  },
  missedAppointment: {
    subject: "We missed you today — Let's reschedule",
    body: `
              <h2 style="color:#1e293b;">We missed you today</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">We noticed you were unable to make it to your appointment with Dr. {doctorName} on {date}. We hope everything is okay.</p>
              <p style="color:#475569;">To reschedule your appointment, please contact our reception team:</p>
              <p style="color:#475569;">{clinicPhone}<br>{clinicEmail}</p>
            `,
  },
  prescriptionRenewal: {
    subject: 'Prescription renewal reminder — {renewalDate}',
    body: `
              <h2 style="color:#1e293b;">Prescription Renewal Reminder</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">Your follow-up appointment with Dr. {doctorName} is coming up on <strong>{renewalDate}</strong>.</p>
              <p style="color:#475569;">Current medications: {medicationList}</p>
              <p style="color:#475569;">Please contact reception to confirm your appointment: {clinicPhone}</p>
            `,
  },
  reEngagement: {
    subject: "We haven't seen you in a while, {patientName}",
    body: `
              <h2 style="color:#1e293b;">We miss you at {clinicName}</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">It has been a while since your last visit on <strong>{lastVisitDate}</strong>. Your health is our priority and we would love to see you again.</p>
              <p style="color:#475569;">To book an appointment, contact us at:<br>{clinicPhone}<br>{clinicEmail}</p>
            `,
  },
  aiSummaryReady: {
    subject: 'Your medical report summary is ready',
    body: `
              <h2 style="color:#1e293b;">Report Summary Available</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">Your doctor has reviewed and approved the summary for your report: <strong>{reportTitle}</strong></p>
              <p style="color:#475569; line-height:1.6;">You can now view your simplified health summary by logging into your patient portal.</p>
              <div style="text-align:center; margin:24px 0;">
                <a href="{portalLink}" style="background:#0d9488; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold;">View My Report</a>
              </div>
              <p style="color:#94a3b8; font-size:12px;">This summary is for informational purposes only and does not constitute medical advice.</p>
            `,
  },
};

export const resolveEngagementTemplate = (settings, key) => {
  const stored = settings?.emailTemplates?.[key] || {};
  const fallback = DEFAULT_ENGAGEMENT_TEMPLATES[key] || { subject: '', body: '' };
  return {
    subject: String(stored.subject || '').trim() || fallback.subject,
    body: String(stored.body || '').trim() || fallback.body,
  };
};

export const resolvePatientEmail = (patient) =>
  String(patient?.email || patient?.contact?.email || '')
    .trim()
    .toLowerCase();

export const mailIsConfigured = (settings) =>
  Boolean(
    String(settings?.email?.smtpHost || '').trim()
    && String(settings?.email?.smtpUser || '').trim()
    && String(settings?.email?.fromEmail || '').trim(),
  );

export const emptyTemplatePatch = (settings) => {
  const patch = {};
  Object.entries(DEFAULT_ENGAGEMENT_TEMPLATES).forEach(([key, fallback]) => {
    const current = settings?.emailTemplates?.[key] || {};
    if (!String(current.subject || '').trim()) {
      patch[`emailTemplates.${key}.subject`] = fallback.subject;
    }
    if (!String(current.body || '').trim()) {
      patch[`emailTemplates.${key}.body`] = fallback.body;
    }
  });
  return patch;
};

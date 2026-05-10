/**
 * Mail delivery reads SMTP from SystemSettings (cached briefly).
 *
 * Use sendMailWithRetry() for outbound mail where possible — one automatic retry on transient SMTP failure.
 * Engagement templates support {variable} substitution via renderTemplate().
 */
import nodemailer from 'nodemailer';

import SystemSettings from '../models/SystemSettings.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** NFR-17: one retry after transient SMTP failures. */
export async function sendMailWithRetry(sendMailFn, { logLabel = 'EMAIL_SEND' } = {}) {
  try {
    return await sendMailFn();
  } catch (firstErr) {
    console.warn(`[${logLabel}] First attempt failed:`, firstErr?.message || firstErr);
    await sleep(1500);
    try {
      return await sendMailFn();
    } catch (retryErr) {
      console.error(`[${logLabel}] Retry failed:`, retryErr?.message || retryErr);
      throw retryErr;
    }
  }
}

let _settingsCache = null;
let _settingsCacheTime = 0;

export const invalidateSettingsCache = () => {
  _settingsCache = null;
  _settingsCacheTime = 0;
};

export const getSettings = async () => {
  const CACHE_TTL = 5 * 60 * 1000;
  if (_settingsCache && Date.now() - _settingsCacheTime < CACHE_TTL) {
    return _settingsCache;
  }

  _settingsCache = await SystemSettings.findOne({}).lean();
  _settingsCacheTime = Date.now();
  return _settingsCache;
};

export const getTransporter = async () => {
  const settings = await getSettings();

  if (!settings?.email?.smtpHost || !settings?.email?.smtpUser) {
    throw new Error('Email not configured. Please configure SMTP in Settings.');
  }

  const secure = settings.email.smtpEncryption === 'ssl';
  const port = settings.email.smtpPort || 587;

  return nodemailer.createTransport({
    host: settings.email.smtpHost,
    port,
    secure,
    auth: {
      user: settings.email.smtpUser,
      pass: settings.email.smtpPass,
    },
    ...(settings.email.smtpEncryption === 'tls' && !secure
      ? { requireTLS: true, tls: { minVersion: 'TLSv1.2' } }
      : {}),
  });
};

export const renderTemplate = (template, variables = {}) => {
  let rendered = String(template || '');
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(regex, variables[key] || '');
  });
  return rendered;
};

export const wrapInEmailHTML = (content, clinicName) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;
             background: #f8fafc;
             margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #0f172a;
                padding: 24px 40px;
                text-align: center;">
      <h2 style="color: #0d9488; margin: 0;">
        ${clinicName}
      </h2>
    </div>
    <div style="padding: 32px 40px;">
      ${content}
    </div>
    <div style="background: #f8fafc;
                padding: 20px 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px;
                margin: 0;">
        ${clinicName} — This is an automated message.
      </p>
    </div>
  </div>
</body>
</html>
`;

export const sendPasswordResetEmail = async (user, resetUrl) => {
  const settings = await getSettings();
  const clinicName = settings?.clinic?.name || 'CareConnect 360';
  const fromName = settings?.email?.fromName || 'CareConnect 360';
  const fromEmail = settings?.email?.fromEmail;

  if (!fromEmail) {
    throw new Error('From email is not configured in Settings.');
  }

  const transporter = await getTransporter();

  const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;
                   background: #f8fafc;
                   margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <div style="background: #0f172a;
                      padding: 32px 40px;
                      text-align: center;">
            <h1 style="color: #0d9488; margin: 0;
                       font-size: 24px;">
              ${clinicName}
            </h1>
            <p style="color: #94a3b8; margin: 8px 0 0;">
              Healthcare CRM System
            </p>
          </div>

          <div style="padding: 40px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">
              Password Reset Request
            </h2>
            <p style="color: #475569; line-height: 1.6;">
              Hello <strong>${user.name}</strong>,
            </p>
            <p style="color: #475569; line-height: 1.6;">
              We received a request to reset your password
              for your ${clinicName} account.
              Click the button below to reset it.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                 style="background: #0d9488;
                        color: #ffffff;
                        padding: 14px 32px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: bold;
                        font-size: 16px;
                        display: inline-block;">
                Reset My Password
              </a>
            </div>

            <div style="background: #fef3c7;
                        border: 1px solid #fcd34d;
                        border-radius: 8px;
                        padding: 16px;
                        margin: 24px 0;">
              <p style="color: #92400e; margin: 0;
                        font-size: 14px;">
                This link expires in <strong>1 hour</strong>.
                If you did not request this, please ignore
                this email. Your password will not change.
              </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px;">
              If the button does not work, copy this link:
              <br>
              <a href="${resetUrl}"
                 style="color: #0d9488;
                        word-break: break-all;">
                ${resetUrl}
              </a>
            </p>
          </div>

          <div style="background: #f8fafc;
                      padding: 24px 40px;
                      text-align: center;
                      border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px;
                      margin: 0;">
              ${clinicName} — Healthcare CRM System
              <br>
              This is an automated message.
              Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

  await sendMailWithRetry(
    () =>
      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: user.email,
        subject: `Reset your ${clinicName} password`,
        html,
      }),
    { logLabel: 'PASSWORD_RESET_EMAIL' },
  );
};

export const toEmailErrorMessage = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  const command = String(error?.command || '').toUpperCase();

  if (
    message.includes('not configured')
    || message.includes('from email')
  ) {
    return 'Email is not configured. Please configure SMTP in Settings.';
  }

  if (
    code === 'EAUTH'
    || message.includes('invalid login')
    || message.includes('authentication')
    || command === 'AUTH'
  ) {
    return 'SMTP authentication failed. Please verify SMTP user/password in Settings.';
  }

  if (
    code === 'ENOTFOUND'
    || code === 'ECONNREFUSED'
    || code === 'ETIMEDOUT'
    || message.includes('connect')
    || message.includes('timeout')
  ) {
    return 'SMTP server is unreachable. Please verify SMTP host/port and network access.';
  }

  return 'Email could not be sent. Please contact your administrator.';
};

export const sendEngagementEmail = async ({
  to,
  subject,
  bodyTemplate,
  variables,
  clinicName,
}) => {
  const transporter = await getTransporter();
  const settings = await getSettings();

  const renderedSubject = renderTemplate(subject, variables);
  const renderedBody = renderTemplate(bodyTemplate, variables);
  const html = wrapInEmailHTML(renderedBody, clinicName);

  await sendMailWithRetry(
    () =>
      transporter.sendMail({
        from: `"${clinicName}" <${settings?.email?.fromEmail}>`,
        to,
        subject: renderedSubject,
        html,
      }),
    { logLabel: 'ENGAGEMENT_EMAIL' },
  );
};

export const sendPortalWelcomeEmail = async ({
  patient,
  email,
  tempPassword,
  approvedByName,
  existingCredentials = false,
}) => {
  const settings = await getSettings();
  const clinicName = settings?.clinic?.name || 'CareConnect 360';
  const fromEmail = settings?.email?.fromEmail;
  const fromName = settings?.email?.fromName || clinicName;
  const portalUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/login`;

  if (!settings?.email?.smtpHost) return;

  const transporter = await getTransporter();
  const approverLine = approvedByName
    ? `<p style="color:#64748b; font-size:14px; margin:0 0 16px;">Approved by <strong>${approvedByName}</strong>.</p>`
    : '';

  const credentialsInner = existingCredentials
    ? `
              <p style="margin:4px 0; color:#1e293b; font-size:15px;">
                <strong>Portal URL:</strong>
                <a href="${portalUrl}" style="color:#0d9488;">${portalUrl}</a>
              </p>
              <p style="margin:4px 0; color:#1e293b; font-size:15px;">
                <strong>Email:</strong> ${email}
              </p>
              <p style="margin:12px 0 0; color:#475569; font-size:14px; line-height:1.6;">
                Sign in with the <strong>same password you chose when you registered</strong>.
                If you forgot it, use &quot;Forgot password&quot; on the login page.
              </p>`
    : `
              <p style="margin:4px 0; color:#1e293b;
                        font-size:15px;">
                <strong>Portal URL:</strong>
                <a href="${portalUrl}"
                   style="color:#0d9488;">
                  ${portalUrl}
                </a>
              </p>
              <p style="margin:4px 0; color:#1e293b;
                        font-size:15px;">
                <strong>Email:</strong> ${email}
              </p>
              <p style="margin:4px 0; color:#1e293b;
                        font-size:15px;">
                <strong>Temporary Password:</strong>
                <code style="background:#e2e8f0;
                             padding:2px 8px;
                             border-radius:4px;
                             font-size:14px;
                             letter-spacing:1px;">
                  ${tempPassword}
                </code>
              </p>`;

  const warningBlock = existingCredentials
    ? ''
    : `
            <div style="background:#fef3c7;
                        border:1px solid #fcd34d;
                        border-radius:8px;
                        padding:16px; margin:24px 0;">
              <p style="color:#92400e; margin:0;
                        font-size:14px;">
                ⚠️ <strong>Important:</strong>
                You will be asked to change this
                temporary password when you first log in.
                Please choose a strong password.
              </p>
            </div>`;

  const headline = existingCredentials
    ? 'Your patient portal access is approved'
    : 'Welcome to your Patient Portal! 🎉';

  const intro = existingCredentials
    ? `Your registration has been approved by ${clinicName}. You can now sign in and use the patient portal for your reports, prescriptions, appointments, and invoices.`
    : `Your patient portal account has been created
              by ${clinicName}. You can now securely access
              your medical reports, prescriptions,
              appointments, and invoices online.`;

  const subject = existingCredentials
    ? `Patient portal approved — ${clinicName}`
    : `Welcome to ${clinicName} Patient Portal — Your Login Details`;

  const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;
                   background: #f8fafc; margin:0;
                   padding:20px;">
        <div style="max-width:600px; margin:0 auto;
                    background:#fff; border-radius:12px;
                    overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <div style="background:#0f172a; padding:32px 40px;
                      text-align:center;">
            <h1 style="color:#0d9488; margin:0;
                       font-size:24px;">
              ${clinicName}
            </h1>
            <p style="color:#94a3b8; margin:8px 0 0;
                      font-size:14px;">
              Patient Portal
            </p>
          </div>

          <div style="padding:40px;">
            <h2 style="color:#1e293b; margin:0 0 16px;">
              ${headline}
            </h2>
            ${approverLine}
            <p style="color:#475569; line-height:1.6;">
              Dear <strong>${patient?.name || 'Patient'}</strong>,
            </p>
            <p style="color:#475569; line-height:1.6;">
              ${intro}
            </p>

            <div style="background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:8px;
                        padding:20px; margin:24px 0;">
              <p style="margin:0 0 8px; color:#64748b;
                         font-size:12px; font-weight:600;
                         text-transform:uppercase;
                         letter-spacing:0.05em;">
                YOUR LOGIN DETAILS
              </p>
              ${credentialsInner}
            </div>

            ${warningBlock}

            <div style="text-align:center; margin:32px 0;">
              <a href="${portalUrl}"
                 style="background:#0d9488; color:#fff;
                        padding:14px 32px;
                        border-radius:8px;
                        text-decoration:none;
                        font-weight:bold;
                        font-size:16px;
                        display:inline-block;">
                Access Your Portal
              </a>
            </div>

            <p style="color:#94a3b8; font-size:12px;
                      margin-top:32px;">
              Your Patient ID: <strong>${patient?.patientId || '-'}</strong>
              <br/>
              If you did not request this account or have
              any questions, please contact
              ${clinicName} directly.
            </p>
          </div>

          <div style="background:#f8fafc;
                      padding:20px 40px;
                      text-align:center;
                      border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8; font-size:12px;
                      margin:0;">
              ${clinicName} — Patient Portal
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

  await sendMailWithRetry(
    () =>
      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject,
        html,
      }),
    { logLabel: 'PORTAL_WELCOME_EMAIL' },
  );
};

export const sendEmailVerificationEmail = async (user, verifyUrl) => {
  const settings = await getSettings();
  const clinicName = settings?.clinic?.name || 'CareConnect 360';
  const fromName = settings?.email?.fromName || 'CareConnect 360';
  const fromEmail = settings?.email?.fromEmail;

  if (!fromEmail) {
    throw new Error('From email is not configured in Settings.');
  }

  const transporter = await getTransporter();
  const html = `
      <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: #0f172a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #0d9488; margin: 0; font-size: 24px;">${clinicName}</h1>
          </div>
          <div style="padding: 40px;">
            <p style="color: #475569;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #475569;">Please verify your email address for your CareConnect account.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyUrl}" style="background: #0d9488; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify email</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">Link expires in 48 hours. If you did not sign up, ignore this message.</p>
            <p style="color: #94a3b8; font-size: 12px; word-break: break-all;"><a href="${verifyUrl}" style="color: #0d9488;">${verifyUrl}</a></p>
          </div>
        </div>
      </body></html>`;

  await sendMailWithRetry(
    () =>
      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: user.email,
        subject: `Verify your email — ${clinicName}`,
        html,
      }),
    { logLabel: 'VERIFY_EMAIL' },
  );
};

export const sendDoctorPatientCheckedInEmail = async ({ doctorEmail, doctorName, patientName, timeSlot, clinicName }) => {
  const settings = await getSettings();
  const name = clinicName || settings?.clinic?.name || 'CareConnect 360';
  const fromEmail = settings?.email?.fromEmail;
  const fromName = settings?.email?.fromName || name;

  if (!doctorEmail || !fromEmail || !settings?.email?.smtpHost) return;

  const transporter = await getTransporter();
  const html = wrapInEmailHTML(
    `<p style="color:#475569;">Hello Dr. ${doctorName || 'Doctor'},</p>
     <p style="color:#475569;"><strong>${patientName || 'A patient'}</strong> has checked in for their appointment today.</p>
     <p style="color:#64748b; font-size:14px;">Time slot: <strong>${timeSlot || '—'}</strong></p>`,
    name,
  );

  await sendMailWithRetry(
    () =>
      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: doctorEmail,
        subject: `Patient checked in — ${name}`,
        html,
      }),
    { logLabel: 'DOCTOR_CHECKIN_EMAIL' },
  );
};

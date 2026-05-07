import AuditLog from '../models/AuditLog.js';

const safeString = (value) => (typeof value === 'string' ? value.trim() : '');

const inferTargetCollection = (target = '') => {
  const source = String(target || '');
  const [prefix] = source.split(':');
  const key = safeString(prefix).toLowerCase();
  if (!key) return '';

  const map = {
    user: 'users',
    users: 'users',
    patient: 'patients',
    patients: 'patients',
    appointment: 'appointments',
    appointments: 'appointments',
    invoice: 'invoices',
    invoices: 'invoices',
    doctorprofile: 'doctorProfiles',
    doctorprofiles: 'doctorProfiles',
    engagementlog: 'engagementLogs',
    engagementlogs: 'engagementLogs',
    auditlog: 'auditLogs',
    auditlogs: 'auditLogs',
    consultation: 'consultations',
    consultations: 'consultations',
    report: 'reports',
    reports: 'reports',
  };
  return map[key] || key;
};

const resolveIp = (req) => {
  if (!req) return null;
  const xff = req.headers?.['x-forwarded-for'];
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).trim();
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.connection?.remoteAddress || req.ip || null;
};

const auditLogger = async ({
  userId = null,
  action,
  target,
  targetCollection,
  details = {},
  req = null,
}) => {
  try {
    await AuditLog.create({
      userId: userId || null,
      action: String(action || '').trim().toUpperCase(),
      target: String(target || '').trim(),
      targetCollection: safeString(targetCollection) || inferTargetCollection(target),
      details: details && typeof details === 'object' ? details : {},
      ipAddress: resolveIp(req),
      userAgent: req ? req.headers?.['user-agent'] || null : null,
    });
  } catch (err) {
    // Audit failures must never break main business flow.
    console.error('[AUDIT LOG FAILED]:', err.message);
  }
};

export default auditLogger;
export { inferTargetCollection };

export const ACTION_LABELS = {
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',
  USER_DEACTIVATED: 'User Deactivated',
  USER_ACTIVATED: 'User Activated',
  ROLE_CHANGED: 'Role Changed',
  PATIENT_CREATED: 'Patient Registered',
  PATIENT_UPDATED: 'Patient Updated',
  PATIENT_ARCHIVED: 'Patient Archived',
  DOCTOR_CREATED: 'Doctor Added',
  DOCTOR_UPDATED: 'Doctor Profile Updated',
  DOCTOR_DEACTIVATED: 'Doctor Deactivated',
  DOCTOR_ACTIVATED: 'Doctor Activated',
  SCHEDULE_UPDATED: 'Schedule Updated',
  STAFF_UPDATED: 'Staff Updated',
  STAFF_DEACTIVATED: 'Staff Deactivated',
  STAFF_ACTIVATED: 'Staff Activated',
  APPOINTMENT_CREATED: 'Appointment Booked',
  APPOINTMENT_STATUS_CHANGED: 'Appointment Status Changed',
  PATIENT_CHECKED_IN: 'Patient Checked In',
  INVOICE_CREATED: 'Invoice Generated',
  INVOICE_UPDATED: 'Invoice Updated',
  PAYMENT_RECORDED: 'Payment Recorded',
  CRON_MISSED_APPOINTMENTS: 'Auto-Marked Missed',
};

export const formatAction = (action) =>
  ACTION_LABELS[action] || String(action || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const SEVERITY_MAP = {
  ROLE_CHANGED: 'critical',
  USER_DEACTIVATED: 'critical',
  STAFF_DEACTIVATED: 'critical',
  DOCTOR_DEACTIVATED: 'critical',
  PATIENT_ARCHIVED: 'critical',
  PAYMENT_RECORDED: 'warning',
  INVOICE_UPDATED: 'warning',
  APPOINTMENT_STATUS_CHANGED: 'warning',
  DOCTOR_ACTIVATED: 'warning',
  STAFF_ACTIVATED: 'warning',
  USER_ACTIVATED: 'warning',
  CRON_MISSED_APPOINTMENTS: 'system',
};

export const getSeverity = (action) => SEVERITY_MAP[action] || 'info';

export const SEVERITY_COLORS = {
  critical: '#dc2626',
  warning: '#d97706',
  info: '#0d9488',
  system: '#6b7280',
};

export const SEVERITY_LABELS = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
  system: 'System',
};

export const ACTION_ICONS = {
  user: '👤',
  patient: '🏥',
  doctor: '⚕️',
  appointment: '📅',
  billing: '💰',
  system: '⚙️',
  security: '🔒',
};

export const getActionCategory = (action) => {
  if (action?.startsWith('USER_') || action === 'ROLE_CHANGED') return 'user';
  if (action?.startsWith('PATIENT_')) return 'patient';
  if (action?.startsWith('DOCTOR_') || action === 'SCHEDULE_UPDATED') return 'doctor';
  if (action?.startsWith('STAFF_')) return 'doctor';
  if (action?.startsWith('APPOINTMENT_') || action === 'PATIENT_CHECKED_IN') return 'appointment';
  if (action?.startsWith('INVOICE_') || action === 'PAYMENT_RECORDED') return 'billing';
  if (action?.startsWith('CRON_')) return 'system';
  return 'system';
};

export const formatTarget = (target) => {
  if (!target) return { collection: '', id: '', display: '—' };
  const [collection, id] = String(target).split(':');
  return { collection, id, display: target };
};

export const getTargetLink = (target) => {
  if (!target) return null;
  const [collection] = String(target).split(':');
  const links = {
    User: '/users',
    Patient: '/patients',
    Invoice: '/billing',
    Appointment: '/appointments',
    DoctorProfile: '/doctors',
  };
  return links[collection] || null;
};

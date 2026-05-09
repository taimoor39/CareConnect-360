const BADGE_STYLES = {
  active: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80' },
  inactive: { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
  pending: { bg: 'rgba(217,119,6,0.12)', color: '#fbbf24' },
  scheduled: { bg: 'rgba(37,99,235,0.12)', color: '#60a5fa' },
  completed: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80' },
  missed: { bg: 'rgba(220,38,38,0.12)', color: '#f87171' },
  cancelled: { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
  checkedin: { bg: 'rgba(13,148,136,0.12)', color: '#2dd4bf' },
  inprogress: { bg: 'rgba(139,92,246,0.12)', color: '#c4b5fd' },
  paid: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80' },
  unpaid: { bg: 'rgba(220,38,38,0.12)', color: '#f87171' },
  partial: { bg: 'rgba(217,119,6,0.12)', color: '#fbbf24' },
  admin: { bg: 'rgba(220,38,38,0.12)', color: '#f87171' },
  doctor: { bg: 'rgba(37,99,235,0.12)', color: '#60a5fa' },
  receptionist: { bg: 'rgba(217,119,6,0.12)', color: '#fbbf24' },
  patient: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80' },
  approved: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80' },
};

/** Map UI/API strings to BADGE_STYLES keys */
export function normalizeBadgeType(type) {
  const raw = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
  if (!raw) return 'inactive';
  const map = {
    checkedin: 'checkedin',
    inprogress: 'inprogress',
    scheduled: 'scheduled',
    completed: 'completed',
    missed: 'missed',
    cancelled: 'cancelled',
    pending: 'pending',
    active: 'active',
    inactive: 'inactive',
    paid: 'paid',
    unpaid: 'unpaid',
    partial: 'partial',
    admin: 'admin',
    doctor: 'doctor',
    receptionist: 'receptionist',
    patient: 'patient',
    approved: 'approved',
  };
  return map[raw] || raw || 'inactive';
}

function Badge({ type, label }) {
  const key = normalizeBadgeType(type);
  const s = BADGE_STYLES[key] || BADGE_STYLES.inactive;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? type}
    </span>
  );
}

export default Badge;

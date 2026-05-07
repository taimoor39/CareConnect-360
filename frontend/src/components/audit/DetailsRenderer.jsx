function humanKey(value = '') {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPill({ value, tone = 'slate' }) {
  const palette = {
    slate: 'bg-slate-500/15 text-slate-200 border-slate-500/30',
    rose: 'bg-rose-500/15 text-rose-100 border-rose-300/30',
    amber: 'bg-amber-500/15 text-amber-100 border-amber-300/30',
    sky: 'bg-sky-500/15 text-sky-100 border-sky-300/30',
    emerald: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/30',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${palette[tone] || palette.slate}`}>
      {String(value)}
    </span>
  );
}

function FromToBlock({ label, from, to, tone = 'sky' }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
        <span className="text-slate-400">FROM:</span>
        <StatusPill value={from} tone="amber" />
        <span className="text-slate-500">→</span>
        <span className="text-slate-400">TO:</span>
        <StatusPill value={to} tone={tone} />
      </div>
    </div>
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function renderValue(value) {
  if (value === null || typeof value === 'undefined') return '—';
  if (isPlainObject(value) || Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function DetailsRenderer({ details = {}, action = '' }) {
  if (!details || typeof details !== 'object') {
    return <p className="text-xs text-slate-500">No additional details</p>;
  }

  const entries = Object.entries(details).filter(
    ([, v]) => typeof v !== 'undefined' && v !== null && v !== ''
  );

  if (!entries.length) {
    return <p className="text-xs text-slate-500">No additional details</p>;
  }

  // Smart cases
  if (action === 'ROLE_CHANGED' && details.from && details.to) {
    return (
      <div className="mt-2 space-y-2">
        <FromToBlock label="Role Changed" from={details.from} to={details.to} tone="sky" />
        {details.userName ? (
          <p className="text-[11px] text-slate-400">User: <span className="text-slate-200">{details.userName}</span></p>
        ) : null}
      </div>
    );
  }

  const isStatusLike = (action === 'APPOINTMENT_STATUS_CHANGED'
    || action === 'USER_DEACTIVATED' || action === 'USER_ACTIVATED'
    || action === 'DOCTOR_DEACTIVATED' || action === 'DOCTOR_ACTIVATED'
    || action === 'STAFF_DEACTIVATED' || action === 'STAFF_ACTIVATED'
    || action === 'PATIENT_ARCHIVED');

  if (isStatusLike && details.from && details.to) {
    return (
      <div className="mt-2">
        <FromToBlock label="Status Changed" from={details.from} to={details.to} tone="emerald" />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1 rounded border border-slate-800 bg-slate-950 p-2">
      {entries.map(([key, value]) => (
        <p key={key} className="text-slate-300">
          <span className="text-slate-400">{humanKey(key)}:</span>{' '}
          <span className="font-mono text-[11px] text-slate-200">{renderValue(value)}</span>
        </p>
      ))}
    </div>
  );
}

export default DetailsRenderer;

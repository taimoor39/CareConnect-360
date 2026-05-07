import { useNavigate } from 'react-router-dom';
import ActionBadge from './ActionBadge.jsx';
import DetailsRenderer from './DetailsRenderer.jsx';
import SeverityDot from './SeverityDot.jsx';
import { formatAction, formatTarget, getSeverity, getTargetLink } from '../../utils/auditHelpers.js';
import { formatDateInPakistan, formatTimeInPakistan } from '../../utils/isoDate.js';

const ROLE_BADGE_STYLES = {
  admin: 'bg-rose-500/15 text-rose-100 border-rose-300/30',
  doctor: 'bg-sky-500/15 text-sky-100 border-sky-300/30',
  receptionist: 'bg-amber-500/15 text-amber-100 border-amber-300/30',
  patient: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/30',
  system: 'bg-slate-500/15 text-slate-200 border-slate-500/30',
};

const TARGET_LABELS = {
  User: 'View User',
  Patient: 'View Patient',
  Invoice: 'View Invoice',
  Appointment: 'View Appointment',
  DoctorProfile: 'View Doctor',
};

function initialsOf(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || 'S';
}

function AuditLogDrawer({ open, log, onClose, onPrev, onNext, canPrev, canNext }) {
  const navigate = useNavigate();
  if (!open || !log) return null;

  const target = formatTarget(log.target);
  const targetLink = getTargetLink(log.target);
  const targetCollection = target.collection || '';
  const targetButtonLabel = TARGET_LABELS[targetCollection] || 'View Record';
  const performer = log.user || null;
  const performerRole = performer?.role || (log.userId ? 'unknown' : 'system');
  const roleBadgeClass = ROLE_BADGE_STYLES[performerRole] || ROLE_BADGE_STYLES.system;
  const severity = getSeverity(log.action);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SeverityDot severity={severity} />
              <h3 className="truncate text-lg font-semibold text-white">{formatAction(log.action)}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {formatDateInPakistan(log.createdAt, 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' at '}
              {formatTimeInPakistan(log.createdAt, 'en-US', { hour12: true, second: '2-digit' })}
            </p>
            {log._id ? (
              <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={String(log._id)}>
                _id: {String(log._id)}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">✕</button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Performed By</p>
            <div className="mt-2 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold ${roleBadgeClass}`}>
                {performer ? initialsOf(performer.name) : 'SYS'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-100">{performer?.name || 'System'}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${roleBadgeClass}`}>
                    {performerRole}
                  </span>
                  {performer?.email ? (
                    <span className="truncate text-[11px] text-slate-400">{performer.email}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Action</p>
            <div className="mt-2"><ActionBadge action={log.action} /></div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Affected Record</p>
            <p className="mt-2 text-slate-200">{log.targetCollection || targetCollection || '—'}</p>
            <p className="font-mono text-[11px] text-slate-400">{target.id || target.display}</p>
            {targetLink ? (
              <button
                type="button"
                onClick={() => navigate(targetLink)}
                className="mt-2 text-xs text-teal-200 hover:text-teal-100"
              >
                {targetButtonLabel} →
              </button>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Technical Details</p>
            <p className="mt-2 text-slate-300">
              IP Address: <span className="font-mono">{log.ipAddress === '::1' ? 'localhost' : (log.ipAddress || 'System')}</span>
            </p>
            <p
              className="mt-1 truncate text-slate-300"
              title={log.userAgent || ''}
            >
              User Agent: <span className="text-slate-400">{log.userAgent || 'Not available'}</span>
            </p>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Change Details</p>
            <DetailsRenderer details={log.details || {}} action={log.action} />
          </section>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
          <button type="button" disabled={!canPrev} onClick={onPrev} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40">← Previous Log</button>
          <button type="button" disabled={!canNext} onClick={onNext} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40">Next Log →</button>
        </div>
      </aside>
    </div>
  );
}

export default AuditLogDrawer;

import { Link, useNavigate } from 'react-router-dom';

function PendingAlerts({ data }) {
  const navigate = useNavigate();
  const pending = data || {};
  return (
    <div className="mt-3 space-y-1 text-xs">
      {pending.unpaidInvoices > 0 ? <button type="button" onClick={() => navigate('/billing?status=Unpaid')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200"><span>{pending.unpaidInvoices} invoices unpaid</span><span>Review →</span></button> : null}
      {pending.missedToday > 0 ? <button type="button" onClick={() => navigate('/appointments?status=Missed')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200"><span>{pending.missedToday} appointments missed today</span><span>View →</span></button> : null}
      {pending.incompleteProfiles > 0 ? <button type="button" onClick={() => navigate('/doctors')} className="flex w-full items-center justify-between rounded bg-slate-900/70 px-2 py-1 text-amber-200"><span>{pending.incompleteProfiles} doctor profiles incomplete</span><span>Complete →</span></button> : null}
      {pending.portalAccessRequests > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'rgba(234,179,8,0.06)',
            border: '1px solid rgba(234,179,8,0.15)',
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#d97706',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, color: '#f1f5f9', flex: 1 }}>
            {pending.portalAccessRequests} patient
            {pending.portalAccessRequests > 1 ? 's' : ''} waiting for portal access
          </span>
          <Link to="/users?tab=portal-requests" style={{ fontSize: 12, color: '#d97706', textDecoration: 'none' }}>
            Review →
          </Link>
        </div>
      ) : null}
      {pending.unpaidInvoices === 0 && pending.missedToday === 0 && pending.incompleteProfiles === 0 && pending.portalAccessRequests === 0 ? <p className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200">All caught up!</p> : null}
    </div>
  );
}

export default PendingAlerts;

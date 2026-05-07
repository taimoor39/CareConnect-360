import { formatDate } from '../../utils/dateHelpers.js';

function PortalStatusBadge({ patient }) {
  if (patient?.userId) {
    return (
      <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3">
        <div className="text-emerald-300">✅ Has Portal Access</div>
        <div className="mt-1 text-xs text-slate-300">
          Login: {patient.portalAccessEmail || patient.email || patient.contact?.email || '-'}
        </div>
      </div>
    );
  }

  if (patient?.portalAccessStatus === 'pending') {
    return (
      <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3">
        <div className="text-amber-300">🕐 Portal access request pending</div>
        <div className="mt-1 text-xs text-slate-300">Awaiting admin approval</div>
        <div className="mt-1 text-xs text-slate-400">
          Requested: {patient.portalAccessRequestedAt ? formatDate(patient.portalAccessRequestedAt) : '-'}
        </div>
      </div>
    );
  }

  return <span className="text-slate-500">○ No Login Account</span>;
}

export default PortalStatusBadge;

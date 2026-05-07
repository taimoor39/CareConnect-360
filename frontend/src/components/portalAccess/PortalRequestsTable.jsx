import { Link } from 'react-router-dom';

function PortalRequestsTable({
  loading,
  requests,
  onApprove,
  onReject,
  onEditEmail,
  onReopen,
  formatDate,
  relativeTime,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="text-slate-400">
          <tr>
            <th className="px-2 py-2">Patient</th>
            <th className="px-2 py-2">Requested Email</th>
            <th className="px-2 py-2">Requested By</th>
            <th className="px-2 py-2">Requested At</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" className="px-2 py-3 text-slate-400">Loading requests...</td></tr>
          ) : requests.length === 0 ? (
            <tr><td colSpan="6" className="px-2 py-3 text-slate-400">No requests found</td></tr>
          ) : requests.map((request) => (
            <tr key={request._id} className="border-t border-slate-800">
              <td className="px-2 py-2">
                <div className="text-slate-100">{request.patientId?.name || '-'}</div>
                <div className="text-[11px] text-slate-400">{request.patientId?.patientId || '-'}</div>
              </td>
              <td className="px-2 py-2"><span className="font-mono text-[11px] text-slate-200">{request.requestedEmail}</span></td>
              <td className="px-2 py-2">
                <div className="text-slate-100">{request.requestedBy?.name || '-'}</div>
                <div className="text-[11px] text-slate-400">{request.requestedBy?.role || '-'}</div>
              </td>
              <td className="px-2 py-2 text-slate-300">
                {formatDate(request.createdAt)}
                <div className="text-[11px] text-slate-500">({relativeTime(request.createdAt)})</div>
              </td>
              <td className="px-2 py-2">
                <span className={`rounded-full px-2 py-1 text-[10px] ${
                  request.status === 'pending' ? 'bg-amber-500/20 text-amber-200'
                    : request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-rose-500/20 text-rose-200'
                }`}>
                  {request.status === 'pending' ? 'Pending Review' : request.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </td>
              <td className="px-2 py-2">
                {request.status === 'pending' ? (
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => onApprove(request)} className="rounded bg-emerald-500 px-2 py-1 text-[11px] text-slate-900">✓ Approve</button>
                    <button type="button" onClick={() => onReject(request)} className="rounded border border-rose-400/40 px-2 py-1 text-[11px] text-rose-200">✗ Reject</button>
                    <button type="button" onClick={() => onEditEmail(request)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-300">✏ Edit Email</button>
                  </div>
                ) : request.status === 'approved' ? (
                  <Link to={`/patients?patientId=${request.patientId?._id || ''}`} className="text-teal-300">View Patient →</Link>
                ) : (
                  <button type="button" onClick={() => onReopen(request)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-300">Re-open</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PortalRequestsTable;

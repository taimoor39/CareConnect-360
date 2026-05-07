import { Link } from 'react-router-dom';

const getInitials = (staff) => {
  const parts = String(staff.name || '').trim().split(/\s+/).filter(Boolean);
  const first = (parts[0] || '').charAt(0);
  const second = (parts[1] || '').charAt(0);
  return `${first}${second}`.toUpperCase() || 'R';
};

function StaffTable({
  staff,
  workloadMap,
  loading,
  filters,
  setFilters,
  pagination,
  onRefresh,
  onEdit,
  onToggleStatus,
}) {
  const currentPage = Number(filters.page || 1);
  const pages = Number(pagination.pages || 1);
  const total = Number(pagination.total || staff.length);
  const showingStart = total === 0 ? 0 : (currentPage - 1) * (filters.limit || 10) + 1;
  const showingEnd = Math.min(currentPage * (filters.limit || 10), total);

  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Reception Staff</h2>
        <button type="button" onClick={onRefresh} className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Refresh</button>
      </div>

      <div className="border-b border-slate-800 px-4 py-3">
        <div className="glass-panel flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-300">
            To add a new receptionist, create a user with role &ldquo;Receptionist&rdquo; in User Management.
          </p>
          <Link to="/users" className="whitespace-nowrap text-xs font-semibold text-teal-400 transition hover:text-teal-300">
            Go to User Management &rarr;
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            placeholder="Search receptionist name/email"
            className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Workload</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading staff...</td></tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-300">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-500">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p className="font-semibold text-white">No receptionists found</p>
                    <p className="text-xs text-slate-400">Create a user with role &apos;Receptionist&apos; in User Management</p>
                    <Link to="/users" className="mt-1 rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">
                      Go to User Management &rarr;
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              staff.map((member, index) => {
                const workload = workloadMap[member._id] || { patientsRegistered: 0, appointmentsBooked: 0 };
                const hasWorkload = workload.patientsRegistered > 0 || workload.appointmentsBooked > 0;
                return (
                  <tr key={member._id} className={`${index % 2 === 1 ? 'bg-white/5' : ''} border-b border-slate-800/60 transition hover:bg-slate-900/70`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${
                          member.isActive
                            ? 'bg-teal-400/15 text-teal-100 ring-teal-300/20'
                            : 'bg-slate-500/20 text-slate-200 ring-slate-400/25'
                        }`}>
                          {getInitials(member)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{member.name}</p>
                          <p className="truncate text-[11px] text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{member.phone || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                        member.isActive ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25' : 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasWorkload ? (
                        <div>
                          <p className="text-slate-200">{workload.patientsRegistered} patients registered</p>
                          <p className="text-[11px] text-slate-400">{workload.appointmentsBooked} appointments booked</p>
                        </div>
                      ) : (
                        <span className="text-slate-500">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => onEdit(member)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">Edit</button>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(member)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                            member.isActive
                              ? 'border-rose-300/30 text-rose-100'
                              : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
                          }`}
                        >
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p>Showing {showingStart}-{showingEnd} of {total} staff</p>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, page: 1, limit: Number(event.target.value) }))} className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={currentPage <= 1} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">&larr; Prev</button>
          <span className="rounded-md bg-teal-400/20 px-3 py-1.5 text-teal-100 ring-1 ring-teal-300/30">{currentPage}</span>
          <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pages, prev.page + 1) }))} disabled={currentPage >= pages} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">Next &rarr;</button>
        </div>
      </div>
    </article>
  );
}

export default StaffTable;

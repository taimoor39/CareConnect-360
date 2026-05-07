import { useMemo } from 'react';

const scheduleSummary = (doctor) => {
  const days = doctor?.profile?.schedule?.days || [];
  if (days.length === 0) return '--';
  if (days.length === 5 && days.join(',') === 'Mon,Tue,Wed,Thu,Fri') return 'Mon-Fri';
  return `${days.length} days/week`;
};

function DoctorTable({
  doctors,
  loading,
  onRowClick,
  onEdit,
  onToggleStatus,
  filters,
  setFilters,
  pagination,
}) {
  const specializationOptions = useMemo(() => {
    const values = new Set();
    doctors.forEach((doctor) => {
      const specialization = String(doctor.specialization || '').trim();
      if (specialization) values.add(specialization);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const currentPage = Number(filters.page || 1);
  const pages = Number(pagination.pages || 1);
  const total = Number(pagination.total || doctors.length);
  const showingStart = total === 0 ? 0 : (currentPage - 1) * (filters.limit || 10) + 1;
  const showingEnd = Math.min(currentPage * (filters.limit || 10), total);

  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Doctors</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            placeholder="Search doctor name"
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
          <select
            value={filters.specialization}
            onChange={(event) => setFilters((prev) => ({ ...prev, specialization: event.target.value, page: 1 }))}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
          >
            <option value="">All Specializations</option>
            {specializationOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Specialization</th>
              <th className="px-4 py-3">Qualification</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading doctors...</td></tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-300">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-500">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p className="font-semibold text-white">No doctors found</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              doctors.map((doctor, index) => (
                <tr
                  key={doctor._id}
                  className={`${index % 2 === 1 ? 'bg-white/5' : ''} ${!doctor.profile?.isProfileComplete ? 'border-l-2 border-amber-500/70' : ''} cursor-pointer border-b border-slate-800/60 transition hover:bg-slate-900/70`}
                  onClick={() => onRowClick(doctor)}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{doctor.code || String(doctor._id).slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-medium text-white">{doctor.name}</td>
                  <td className="px-4 py-3 text-slate-200">{doctor.specialization || '--'}</td>
                  <td className="px-4 py-3 text-slate-200">{doctor.qualification || '--'}</td>
                  <td className="px-4 py-3 text-slate-200">{scheduleSummary(doctor)}</td>
                  <td className="px-4 py-3">
                    {doctor.profile?.isProfileComplete ? (
                      <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25">Complete</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/25">Incomplete</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${doctor.isActive ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25' : 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25'}`}>
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {!doctor.profile?.isProfileComplete ? (
                        <button type="button" onClick={() => onEdit(doctor)} className="rounded-md bg-teal-500 px-2.5 py-1 text-[11px] font-semibold text-slate-900">Complete Profile</button>
                      ) : (
                        <>
                          <button type="button" onClick={() => onRowClick(doctor)} className="rounded-md border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">View</button>
                          <button type="button" onClick={() => onEdit(doctor)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">Edit</button>
                          <button type="button" onClick={() => onToggleStatus(doctor)} className="rounded-md border border-rose-300/30 px-2.5 py-1 text-[11px] font-semibold text-rose-100">{doctor.isActive ? 'Deactivate' : 'Activate'}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p>Showing {showingStart}-{showingEnd} of {total} doctors</p>
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

export default DoctorTable;

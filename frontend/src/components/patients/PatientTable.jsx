const genderBadgeClass = {
  Male: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25',
  Female: 'bg-pink-500/15 text-pink-200 ring-1 ring-pink-400/25',
  Other: 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25',
};

const statusBadgeClass = {
  Active: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25',
  Inactive: 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25',
  Discharged: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25',
};

const getInitials = (patient) => {
  const parts = String(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).trim().split(/\s+/);
  const first = (parts[0] || '').charAt(0);
  const last = (parts[1] || '').charAt(0);
  return `${first}${last}`.toUpperCase() || 'P';
};

function PatientTable({
  patients,
  loading,
  tableLoading,
  pagination,
  filters,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onArchive,
  showArchive = true,
}) {
  const total = pagination.total || 0;
  const showingStart = total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min((pagination.page || 1) * (pagination.limit || 10), total);
  const totalPages = pagination.pages || 1;

  const pageButtons = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i += 1) pageButtons.push(i);
  } else {
    pageButtons.push(1);
    if (pagination.page > 3) pageButtons.push('...');
    const start = Math.max(2, pagination.page - 1);
    const end = Math.min(totalPages - 1, pagination.page + 1);
    for (let i = start; i <= end; i += 1) pageButtons.push(i);
    if (pagination.page < totalPages - 2) pageButtons.push('...');
    pageButtons.push(totalPages);
  }

  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Patients</h2>
      </div>

      <div className="relative overflow-x-auto">
        {tableLoading && !loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-teal-300" />
          </div>
        ) : null}

        <table className={`min-w-full text-left text-xs ${tableLoading && !loading ? 'opacity-60' : ''}`}>
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Patient</th>
              <th className="whitespace-nowrap px-4 py-3">Code</th>
              <th className="whitespace-nowrap px-4 py-3">Contact</th>
              <th className="whitespace-nowrap px-4 py-3">Age / Gender</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, idx) => (
                <tr key={`sk-${idx}`} className="border-b border-slate-800/60">
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="skeleton h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-300" colSpan={6}>
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-500">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="font-semibold text-white">No patients found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search</p>
                  </div>
                </td>
              </tr>
            ) : (
              patients.map((patient, index) => (
                <tr key={patient._id} className={`${index % 2 === 1 ? 'bg-white/5' : ''} border-b border-slate-800/60 transition hover:bg-slate-900/70`}>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-100 ring-1 ring-teal-300/20">
                        {getInitials(patient)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-white">{patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()}</p>
                          {patient.userId ? (
                            <span className="inline-flex items-center rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-medium text-teal-300 ring-1 ring-inset ring-teal-500/30">
                              <span className="mr-1">🔗</span> Has Login
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] text-slate-400">{patient.email || patient.contact?.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-[11px] text-slate-300">{patient.patientId || patient.patientCode || '-'}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="truncate text-slate-200">{patient.phone || patient.contact?.phone || '-'}</p>
                    <p className="truncate text-[11px] text-slate-400">{patient.address?.city || '-'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <p className="text-slate-200">{typeof patient.age === 'number' ? patient.age : '-'}</p>
                      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${genderBadgeClass[patient.gender] || genderBadgeClass.Other}`}>
                        {patient.gender || 'Other'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusBadgeClass[patient.status] || statusBadgeClass.Inactive}`}>
                      {patient.status || 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => onView(patient)} className="rounded-md border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">View</button>
                      <button type="button" onClick={() => onEdit(patient)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">Edit</button>
                      {showArchive ? <button type="button" onClick={() => onArchive(patient)} className="rounded-md border border-rose-300/30 px-2.5 py-1 text-[11px] font-semibold text-rose-100">Archive</button> : null}
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
          <p>
            Showing {showingStart}-{showingEnd} of {total} patients
          </p>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select value={filters.limit} onChange={(event) => onLimitChange(Number(event.target.value))} className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, filters.page - 1))}
            disabled={filters.page <= 1}
            className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40"
          >
            ← Prev
          </button>
          {pageButtons.map((item, idx) => (
            item === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-slate-500">...</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`rounded-md px-3 py-1.5 ${item === filters.page ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'border border-slate-700 text-slate-300'}`}
              >
                {item}
              </button>
            )
          ))}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, filters.page + 1))}
            disabled={filters.page >= totalPages}
            className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </article>
  );
}

export default PatientTable;

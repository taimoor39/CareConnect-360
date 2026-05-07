function PatientSearchBar({ searchInput, setSearchInput, statusValue, onStatusChange, onAddClick }) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">⌕</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, phone or patient code..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-10 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-2 my-auto h-6 w-6 rounded-full text-slate-300 hover:bg-slate-800"
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <select value={statusValue} onChange={(event) => onStatusChange(event.target.value)} className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 lg:w-44">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Discharged">Discharged</option>
        </select>

        <button
          type="button"
          onClick={onAddClick}
          className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400"
        >
          + Add Patient
        </button>
      </div>
    </article>
  );
}

export default PatientSearchBar;

import DateDropdown from '../ui/DateDropdown.jsx';
import { todayISOInPakistan } from '../../utils/isoDate.js';

function AppointmentFilters({
  filters,
  setFilters,
  searchInput,
  setSearchInput,
  activeDoctors,
  onOpenBook,
}) {
  const today = todayISOInPakistan();

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4 ring-1 ring-inset ring-white/[0.03] border-l-4 border-l-cyan-400">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-200" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">Appointment date</p>
                  <p className="text-[0.7rem] text-slate-500">Pick a day to narrow the list, or show all dates</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 basis-[min(100%,14rem)]">
                  <DateDropdown
                    value={filters.date}
                    onChange={(iso) => setFilters((prev) => ({ ...prev, date: iso, page: 1 }))}
                    yearFrom={2020}
                    yearTo={2030}
                    monthFormat="short"
                    placeholder={['Day', 'Mo', 'Year']}
                    className="w-full max-w-md"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, date: today, page: 1 }))}
                  className="h-9 shrink-0 whitespace-nowrap rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, date: '', page: 1 }))}
                  className="h-9 shrink-0 whitespace-nowrap rounded-lg border border-slate-600 px-3 text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  All dates
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,14rem)] flex-1">
            <label className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Doctor</label>
            <select
              value={filters.doctorId}
              onChange={(event) => setFilters((prev) => ({ ...prev, doctorId: event.target.value, page: 1 }))}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
            >
              <option value="">All Doctors</option>
              {activeDoctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} - {doctor.specialization || doctor.profile?.specialization || '--'}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full min-w-[10rem] sm:w-48">
            <label className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</label>
            <select
              value={filters.status || 'All Status'}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value === 'All Status' ? '' : event.target.value, page: 1 }))}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
            >
              {['All Status', 'Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Missed', 'Cancelled'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[min(100%,16rem)] flex-1">
            <label className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Patient name or code…"
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
            />
          </div>
          <button
            type="button"
            onClick={onOpenBook}
            className="h-9 shrink-0 rounded-lg bg-teal-500 px-5 text-xs font-semibold text-slate-900 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
          >
            + Book Appointment
          </button>
        </div>
      </div>
    </section>
  );
}

export default AppointmentFilters;

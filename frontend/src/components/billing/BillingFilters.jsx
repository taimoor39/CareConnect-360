import DateDropdown from '../ui/DateDropdown.jsx';
import DateFieldCard from '../ui/DateFieldCard.jsx';

function BillingFilters({ filters, setFilters, searchInput, setSearchInput, onOpenGenerate, hideDateRange = false }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,18rem)] flex-1">
            <label className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Invoice #, patient name or code…"
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
            />
          </div>
          <div className="w-full min-w-[10rem] sm:w-44">
            <label className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</label>
            <select
              value={filters.status || 'All Status'}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value === 'All Status' ? '' : event.target.value, page: 1 }))}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
            >
              <option>All Status</option>
              <option>Paid</option>
              <option>Unpaid</option>
              <option>Partial</option>
            </select>
          </div>
          <button
            type="button"
            onClick={onOpenGenerate}
            className="h-9 shrink-0 rounded-lg bg-teal-500 px-5 text-xs font-semibold text-slate-900 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
          >
            + Generate Invoice
          </button>
        </div>

        {hideDateRange ? null : (
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4 ring-1 ring-inset ring-white/[0.03]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Invoice date range</p>
                <p className="text-[0.7rem] text-slate-500">Filter by when the invoice was created</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateFieldCard label="From" hint="Start of range (inclusive)" accent="teal">
                <DateDropdown
                  value={filters.from}
                  onChange={(iso) => setFilters((prev) => ({ ...prev, from: iso, page: 1 }))}
                  yearFrom={2020}
                  yearTo={2030}
                  monthFormat="short"
                  placeholder={['Day', 'Mo', 'Year']}
                />
              </DateFieldCard>
              <DateFieldCard label="To" hint="End of range (inclusive)" accent="sky">
                <DateDropdown
                  value={filters.to}
                  onChange={(iso) => setFilters((prev) => ({ ...prev, to: iso, page: 1 }))}
                  yearFrom={2020}
                  yearTo={2030}
                  monthFormat="short"
                  placeholder={['Day', 'Mo', 'Year']}
                />
              </DateFieldCard>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default BillingFilters;

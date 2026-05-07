function PatientPaginationBar({ page, pages, total, limit, onPageChange }) {
  if (!total || pages <= 1) return null;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs text-slate-400 sm:flex-row">
      <p>
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="rounded-lg bg-teal-500/15 px-3 py-1.5 font-medium text-teal-100 ring-1 ring-teal-400/25">{page}</span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default PatientPaginationBar;

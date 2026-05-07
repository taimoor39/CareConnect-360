function AuditFilterPills({ pills, onRemove, onClear }) {
  if (!pills.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={() => onRemove(pill.key)}
          className="rounded-full border border-teal-300/30 bg-teal-500/10 px-2 py-1 text-[11px] text-teal-100"
        >
          × {pill.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
      >
        Clear Filters ({pills.length})
      </button>
    </div>
  );
}

export default AuditFilterPills;

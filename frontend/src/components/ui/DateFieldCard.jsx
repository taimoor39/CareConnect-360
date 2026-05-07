/**
 * Groups a date picker with a clear label and optional hint — use for From/To ranges
 * so users always know which boundary they are editing.
 */
const accentMap = {
  teal: 'border-l-teal-400',
  sky: 'border-l-sky-400',
  cyan: 'border-l-cyan-400',
  violet: 'border-l-violet-400',
};

function DateFieldCard({ label, hint, accent = 'teal', children }) {
  const leftColor = accentMap[accent] || accentMap.teal;
  return (
    <div
      className={`rounded-xl border border-slate-600/60 border-l-4 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-950/50 p-3 ring-1 ring-white/[0.05] ${leftColor}`}
    >
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-slate-100">{label}</p>
        {hint ? <p className="mt-0.5 text-[0.7rem] leading-snug text-slate-500">{hint}</p> : null}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export default DateFieldCard;

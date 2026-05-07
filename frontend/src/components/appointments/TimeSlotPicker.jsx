const toTime12 = (hhmm) => {
  if (!hhmm || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return '--';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

function TimeSlotPicker({ slots = [], availableStarts = [], loading, selectedSlot, onSelect }) {
  if (loading) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="mt-2 text-[11px] text-slate-500">Select a doctor and date to see time slots.</p>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {slots.map((slot) => {
        const available = availableStarts.includes(slot.start);
        const selected = selectedSlot === slot.full;
        return (
          <button
            key={slot.full}
            type="button"
            disabled={!available}
            onClick={() => available && onSelect(slot.full)}
            className={[
              'rounded-lg px-2 py-1.5 text-[11px] font-medium transition',
              selected
                ? 'bg-teal-500 text-slate-900 ring-2 ring-teal-300'
                : available
                  ? 'border border-teal-300/30 bg-teal-400/10 text-teal-100 hover:bg-teal-400/20'
                  : 'cursor-not-allowed border border-slate-700/50 bg-slate-900/30 text-slate-600 line-through',
            ].join(' ')}
          >
            {toTime12(slot.start)}
          </button>
        );
      })}
    </div>
  );
}

export default TimeSlotPicker;

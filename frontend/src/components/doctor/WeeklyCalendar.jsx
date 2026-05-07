import { formatDateInPakistan, isoDateInPakistan } from '../../utils/isoDate.js';
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyCalendar({
  weekStart,
  weekDates,
  grouped,
  status,
  setStatus,
  onPrevWeek,
  onNextWeek,
  onToday,
  viewMode,
  setViewMode,
  onOpenAppointment,
  weeklyRows,
  stats,
}) {
  const workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <>
      <section className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onPrevWeek} className="rounded-md border border-slate-700 px-3 py-2 text-xs">← Prev Week</button>
          <p className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
            Week of {formatDateInPakistan(weekStart)}-{formatDateInPakistan(weekDates[6])}
          </p>
          <button type="button" onClick={onNextWeek} className="rounded-md border border-slate-700 px-3 py-2 text-xs">Next Week →</button>
          <button type="button" onClick={onToday} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100">Today</button>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
            {['All', 'Scheduled', 'Completed', 'Missed'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setViewMode('calendar')} className={`rounded-md px-3 py-2 text-xs ${viewMode === 'calendar' ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'border border-slate-700'}`}>Calendar</button>
            <button type="button" onClick={() => setViewMode('list')} className={`rounded-md px-3 py-2 text-xs ${viewMode === 'list' ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'border border-slate-700'}`}>List</button>
          </div>
        </div>
      </section>

      {viewMode === 'calendar' ? (
        <section className="grid gap-3 xl:grid-cols-7">
          {weekDates.map((date, idx) => {
            const key = isoDateInPakistan(date);
            const dayLabel = weekDays[idx];
            const isWorking = workingDays.includes(dayLabel);
            const rows = grouped.get(key) || [];
            return (
              <article key={key} className={`rounded-xl border p-3 ${isWorking ? 'border-slate-800 bg-slate-950/40' : 'border-slate-900 bg-slate-950/80'}`}>
                <p className="text-xs font-semibold text-white">{dayLabel}</p>
                <p className="text-[11px] text-slate-400">{formatDateInPakistan(date)}</p>
                {!isWorking ? <p className="mt-2 text-[11px] text-slate-500">Day Off</p> : null}
                <div className="mt-3 space-y-2">
                  {rows.map((row) => (
                    <button key={row._id} type="button" onClick={() => onOpenAppointment(row)} className="w-full rounded-md border border-slate-800 bg-slate-900/70 p-2 text-left text-xs hover:border-slate-600">
                      <p className="text-slate-100">{row.timeSlot} {row.patientId?.name}</p>
                      <p className="text-[11px] text-slate-400">{row.status}</p>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="glass-panel overflow-hidden rounded-2xl">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody>
              {weeklyRows.map((row) => (
                <tr key={row._id} className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-900/70" onClick={() => onOpenAppointment(row)}>
                  <td className="px-4 py-3">{formatDateInPakistan(row.date)}</td>
                  <td className="px-4 py-3">{row.timeSlot}</td>
                  <td className="px-4 py-3">{row.patientId?.name}</td>
                  <td className="px-4 py-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="glass-panel rounded-2xl p-4 text-sm">
        This week: {stats.total} total | {stats.completed} completed | {stats.missed} missed
        <span className={`ml-2 rounded-full px-2 py-1 text-xs ${stats.rate >= 70 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
          Completion rate: {stats.rate}%
        </span>
      </section>
    </>
  );
}

export default WeeklyCalendar;


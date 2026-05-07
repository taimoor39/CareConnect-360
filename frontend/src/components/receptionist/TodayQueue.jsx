const statusClass = {
  Scheduled: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-300/25',
  'Checked-In': 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-300/25',
  'In-Progress': 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/25',
  Completed: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/25',
  Missed: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/25',
  Cancelled: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/25',
};

function TodayQueue({ queue, loading, refreshing, onRefresh, onCheckIn, onCancelClick, onReschedule }) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-white">Today&apos;s Queue</h2>
          <p className="text-xs text-slate-400">Live appointment status</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Loading queue...
              </td>
            </tr>
          ) : null}
          {!loading && queue.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                No appointments today
              </td>
            </tr>
          ) : null}
          {queue.map((row) => (
            <tr key={row._id} className="border-b border-slate-800/60">
              <td className="px-4 py-3 text-slate-200">{row.timeSlot || '--'}</td>
              <td className="px-4 py-3">
                <p className="text-white">{row.patientId?.name || '--'}</p>
                <p className="text-[11px] font-mono text-slate-400">
                  {row.patientId?.patientId || row.patientId?.patientCode || '--'}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-white">Dr. {row.doctorId?.name || '--'}</p>
                <p className="text-[11px] text-slate-400">{row.doctorProfile?.specialization || '--'}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[row.status] || statusClass.Cancelled}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {row.status === 'Scheduled' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onCheckIn(row)}
                      className="rounded-md border border-teal-300/25 bg-teal-400/10 px-2.5 py-1 text-[11px] text-teal-100"
                    >
                      Check In
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelClick(row)}
                      className="rounded-md border border-rose-300/30 px-2.5 py-1 text-[11px] text-rose-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
                {row.status === 'Checked-In' ? (
                  <button
                    type="button"
                    disabled
                    className="rounded-md border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100 opacity-80"
                  >
                    Checked In ✓
                  </button>
                ) : null}
                {row.status === 'Completed' ? (
                  <button type="button" disabled className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300">
                    Completed ✓
                  </button>
                ) : null}
                {row.status === 'Missed' ? (
                  <button
                    type="button"
                    onClick={() => onReschedule?.(row)}
                    className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100"
                  >
                    Reschedule
                  </button>
                ) : null}
                {row.status === 'In-Progress' ? (
                  <button type="button" disabled className="rounded-md border border-violet-300/25 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-100 opacity-80">
                    With doctor
                  </button>
                ) : null}
                {row.status === 'Cancelled' ? (
                  <button type="button" disabled className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300">
                    Cancelled
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default TodayQueue;

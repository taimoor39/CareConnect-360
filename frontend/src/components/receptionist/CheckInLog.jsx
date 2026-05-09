function CheckInLog({ rows, loading }) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-white">Today&apos;s check-ins</h2>
          <p className="text-xs text-slate-400">Most recent first &middot; updates after every successful scan</p>
        </div>
        <span className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-slate-200">
          {loading ? '…' : rows.length}
        </span>
      </div>
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Loading…
              </td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                No check-ins yet today
              </td>
            </tr>
          ) : null}
          {!loading && rows.map((row) => (
            <tr key={row._id} className="border-b border-slate-800/60">
              <td className="px-4 py-3 text-slate-200">{row.timeSlot || '--'}</td>
              <td className="px-4 py-3">
                <p className="text-white">{row.patientId?.name || '--'}</p>
                <p className="text-[11px] font-mono text-slate-400">
                  {row.patientId?.patientId || row.patientId?.patientCode || '--'}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-200">Dr. {row.doctorId?.name || '--'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-teal-500/15 px-2 py-1 text-[10px] font-semibold text-teal-200 ring-1 ring-teal-300/25">
                  {row.status || 'Checked-In'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default CheckInLog;

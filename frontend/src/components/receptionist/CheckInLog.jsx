function CheckInLog({ rows, loading }) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-base font-semibold text-white">Today&apos;s check-ins</h3>
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
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                Loading…
              </td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No check-ins yet today
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row._id} className="border-b border-slate-800/60">
              <td className="px-4 py-3">{row.timeSlot || '--'}</td>
              <td className="px-4 py-3">{row.patientId?.name || '--'}</td>
              <td className="px-4 py-3">Dr. {row.doctorId?.name || '--'}</td>
              <td className="px-4 py-3">Checked-In</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default CheckInLog;

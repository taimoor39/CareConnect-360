const statusColors = {
  Scheduled: 'bg-sky-500/15 text-sky-200',
  'Checked-In': 'bg-teal-500/15 text-teal-200',
  'In-Progress': 'bg-amber-500/15 text-amber-200',
  Completed: 'bg-emerald-500/15 text-emerald-200',
};

function TodaySchedule({ rows, dateLabel, onOpenConsultation }) {
  const actionButton = (row) => {
    if (row.status === 'Checked-In') return ['Start Consultation', 'border-teal-300/25 bg-teal-400/10 text-teal-100'];
    if (row.status === 'In-Progress') return ['Continue', 'border-amber-300/25 bg-amber-400/10 text-amber-100'];
    if (row.status === 'Completed') return ['View Notes', 'border-slate-700 bg-slate-800 text-slate-200'];
    return ['View Details', 'border-sky-300/25 bg-sky-400/10 text-sky-100'];
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Today's Appointments</h2>
        <p className="text-xs text-slate-400">{dateLabel}</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="py-8 text-center text-slate-400">No appointments today</p> : rows.map((row) => {
          const [label, cls] = actionButton(row);
          return (
            <article key={row._id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white">{row.timeSlot}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] ${statusColors[row.status] || 'bg-slate-700 text-slate-200'}`}>{row.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">Patient: {row.patientId?.name} <span className="font-mono text-[11px] text-slate-400">{row.patientId?.patientId || row.patientId?.patientCode}</span></p>
              <p className="mt-1 text-xs text-slate-400">Reason: {row.reasonForVisit || '--'}</p>
              <div className="mt-3 border-t border-slate-800 pt-2">
                <button type="button" onClick={() => onOpenConsultation(row)} className={`rounded-md border px-2.5 py-1.5 text-xs ${cls}`}>{label}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default TodaySchedule;


import { formatDate } from '../../utils/dateHelpers.js';

const statusClass = {
  Scheduled: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-300/25',
  'Checked-In': 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-300/25',
  'In-Progress': 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/25',
  Completed: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/25',
  Missed: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/25',
  Cancelled: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/25',
};

const toTime12 = (hhmm) => {
  if (!hhmm || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return '--';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

const formatRange = (slot) => {
  const [start, end] = String(slot || '').split('-');
  return `${toTime12(start)} - ${toTime12(end)}`;
};

function AppointmentActionButtons({ appointment, onStatus, onCancel, onView, onReschedule, mode = 'admin' }) {
  const btn = 'rounded-md px-2.5 py-1 text-[11px] font-semibold';
  if (appointment.status === 'Scheduled') {
    return (
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => onStatus(appointment, 'Checked-In')} className={`${btn} border border-teal-300/25 bg-teal-400/10 text-teal-100`}>Check In</button>
        <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
        <button type="button" onClick={() => onCancel(appointment)} className={`${btn} border border-rose-300/30 text-rose-100`}>Cancel</button>
      </div>
    );
  }
  if (appointment.status === 'Checked-In') {
    if (mode === 'receptionist') {
      return (
        <div className="flex justify-end gap-1.5">
          <button type="button" disabled className={`${btn} border border-emerald-300/25 bg-emerald-500/10 text-emerald-100 opacity-80`}>Checked In ✓</button>
          <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
        </div>
      );
    }
    return (
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => onStatus(appointment, 'In-Progress')} className={`${btn} border border-amber-300/25 bg-amber-400/10 text-amber-100`}>Start</button>
        <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
      </div>
    );
  }
  if (appointment.status === 'In-Progress') {
    return (
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => onStatus(appointment, 'Completed')} className={`${btn} border border-emerald-300/25 bg-emerald-500/10 text-emerald-100`}>Complete</button>
        <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
      </div>
    );
  }
  if (appointment.status === 'Missed') {
    return (
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => onReschedule(appointment)} className={`${btn} border border-amber-300/25 bg-amber-400/10 text-amber-100`}>Reschedule</button>
        <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-1.5">
      <button type="button" onClick={() => onView(appointment)} className={`${btn} border border-sky-300/25 bg-sky-400/10 text-sky-100`}>View</button>
    </div>
  );
}

function AppointmentTable({ appointments, loading, tableLoading, pagination, filters, setFilters, onRefresh, onRowClick, onStatus, onCancel, onReschedule, mode = 'admin' }) {
  const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min((pagination.page || 1) * (pagination.limit || 10), pagination.total || 0);

  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-display text-xl text-white">Appointments</h2>
        <button type="button" onClick={onRefresh} className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Refresh</button>
      </div>
      <div className="relative overflow-x-auto">
        {tableLoading && !loading ? <div className="absolute inset-0 z-10 bg-slate-950/45" /> : null}
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Date &amp; Time</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading appointments...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No appointments found.</td></tr>
            ) : (
              appointments.map((appointment, idx) => (
                <tr key={appointment._id} onClick={() => onRowClick(appointment)} className={`${idx % 2 ? 'bg-white/5' : ''} cursor-pointer border-b border-slate-800/60 hover:bg-slate-900/70`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{appointment.patientId?.name || '--'}</p>
                    <p className="font-mono text-[11px] text-slate-400">{appointment.patientId?.patientId || appointment.patientId?.patientCode || '--'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">Dr. {appointment.doctorId?.name || '--'}</p>
                    <p className="text-[11px] text-slate-400">{appointment.doctorProfile?.specialization || '--'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{formatDate(appointment.date)}</p>
                    <p className="text-[11px] text-slate-400">{formatRange(appointment.timeSlot)}</p>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-200" title={appointment.reasonForVisit || ''}>
                    {appointment.reasonForVisit ? (appointment.reasonForVisit.length > 30 ? `${appointment.reasonForVisit.slice(0, 30)}...` : appointment.reasonForVisit) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[appointment.status] || statusClass.Cancelled}`}>{appointment.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <AppointmentActionButtons appointment={appointment} onStatus={onStatus} onCancel={onCancel} onView={onRowClick} onReschedule={onReschedule} mode={mode} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p>Showing {showingStart}-{showingEnd} of {pagination.total || 0} appointments</p>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, page: 1, limit: Number(event.target.value) }))} className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={filters.page <= 1} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">← Prev</button>
          <span className="rounded-md bg-teal-400/20 px-3 py-1.5 text-teal-100 ring-1 ring-teal-300/30">{pagination.page || 1}</span>
          <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pagination.pages || 1, prev.page + 1) }))} disabled={filters.page >= (pagination.pages || 1)} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">Next →</button>
        </div>
      </div>
    </article>
  );
}

export default AppointmentTable;

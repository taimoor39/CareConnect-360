const toInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const to12Hour = (value) => {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return '--';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function DoctorDetailDrawer({ doctor, isOpen, onClose, onEdit, onToggleStatus }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Doctor Detail</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">&times;</button>
        </div>

        {!doctor ? (
          <p className="mt-5 text-sm text-slate-400">Loading doctor profile...</p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/25 text-lg font-semibold text-teal-100">
                {toInitials(doctor.name)}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{doctor.name}</p>
                <p className="text-xs text-slate-300">{doctor.specialization || '--'}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${doctor.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                  {doctor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <article className="rounded-xl border border-slate-700 bg-slate-800/35 p-4 text-xs text-slate-200">
              <p><span className="text-slate-400">Email:</span> {doctor.email || '--'}</p>
              <p className="mt-1"><span className="text-slate-400">Phone:</span> {doctor.phone || '--'}</p>
              <p className="mt-1"><span className="text-slate-400">Qualification:</span> {doctor.qualification || '--'}</p>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-800/35 p-4">
              <h4 className="font-semibold text-white">Schedule</h4>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                {days.map((day) => (
                  <label key={day} className="flex items-center gap-1 text-slate-300">
                    <input type="checkbox" checked={(doctor.profile?.schedule?.days || []).includes(day)} readOnly />
                    {day}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-300">
                {to12Hour(doctor.profile?.schedule?.shiftStart)} - {to12Hour(doctor.profile?.schedule?.shiftEnd)}
              </p>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-800/35 p-4">
              <h4 className="font-semibold text-white">Stats</h4>
              <div className="mt-2 grid gap-2 text-xs text-slate-200">
                <p>Total consultations this month: <span className="text-teal-200">{doctor.stats?.totalConsultationsThisMonth ?? 0}</span></p>
                <p>Upcoming appointments: <span className="text-teal-200">{doctor.stats?.upcomingAppointments ?? 0}</span></p>
                <p>Completion rate: <span className="text-teal-200">{doctor.stats?.completionRate ?? 0}%</span></p>
              </div>
            </article>

            <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              <button type="button" onClick={() => onEdit(doctor)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100">Edit Doctor</button>
              <button type="button" onClick={() => onToggleStatus(doctor)} className="rounded-md border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-200">{doctor.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default DoctorDetailDrawer;
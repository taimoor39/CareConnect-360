import { useNavigate } from 'react-router-dom';

const statusDotClass = {
  Scheduled: 'bg-sky-500',
  'Checked-In': 'bg-teal-500',
  'In-Progress': 'bg-amber-400 animate-pulse',
  Completed: 'bg-emerald-500',
  Missed: 'bg-rose-500',
  Cancelled: 'bg-slate-500',
};

function TodaySchedule({ data }) {
  const navigate = useNavigate();
  if (data === null) return <div className="glass-panel rounded-2xl p-5 text-sm text-slate-400">Could not load schedule</div>;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Today&apos;s Schedule</h3>
        <span className="rounded bg-teal-500/20 px-2 py-1 text-xs text-teal-200">{data.length} appointments</span>
      </div>
      <div className="space-y-2">
        {data.slice(0, 8).map((item) => (
          <button key={item._id} type="button" onClick={() => navigate(`/appointments?appointmentId=${item._id}`)} className="w-full rounded-lg bg-slate-900/70 p-2 text-left hover:bg-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span>{item.timeSlot}</span>
              <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${statusDotClass[item.status] || 'bg-slate-500'}`} />{item.status}</span>
            </div>
            <p className="text-sm text-white">{item.patientId?.name || '--'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TodaySchedule;

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  Completed: '#16a34a',
  Scheduled: '#2563eb',
  Missed: '#dc2626',
  Cancelled: '#6b7280',
  'Checked-In': '#0d9488',
  'In-Progress': '#d97706',
};

function AppointmentDonut({ data }) {
  const failed = !data;
  const pieData = data?.breakdown?.map((b) => ({ name: b._id, value: b.count })) || [];

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="text-base font-semibold text-white">Appointments</h3>
      <p className="text-xs text-slate-400">This month by status</p>
      {failed ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">Chart data unavailable</div>
      ) : (
        <div className="relative mt-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-[1.75rem] font-semibold text-slate-100">{data?.total || 0}</p>
            <p className="text-[0.6875rem] text-slate-400">Total</p>
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-900/70 px-3 py-2">
          <span className="text-slate-400">Completion Rate: </span>
          <span className={data?.completionRate > 80 ? 'text-emerald-300' : data?.completionRate >= 50 ? 'text-amber-300' : 'text-rose-300'}>{data?.completionRate ?? '—'}%</span>
        </div>
        <div className="rounded-lg bg-slate-900/70 px-3 py-2">
          <span className="text-slate-400">Attendance Rate: </span>
          <span className={data?.attendanceRate > 80 ? 'text-emerald-300' : data?.attendanceRate >= 50 ? 'text-amber-300' : 'text-rose-300'}>{data?.attendanceRate ?? '—'}%</span>
        </div>
      </div>
    </div>
  );
}

export default AppointmentDonut;

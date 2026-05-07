import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function RevenueOverviewPanel({ summary = {}, onSelectPatient }) {
  const monthly = summary.monthlyRevenue || [];
  const methods = summary.methodBreakdown || [];
  const topPatients = summary.topPatients || [];
  const totalMethods = methods.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const currentMonthLabel = monthly[monthly.length - 1]?.month;

  return (
    <aside className="glass-panel h-fit rounded-2xl p-5">
      <h3 className="text-base font-semibold text-white">Revenue Overview</h3>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly}>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip formatter={(value, _, payload) => [`Rs. ${Number(value).toLocaleString()}`, payload?.payload?.month]} />
            <Bar dataKey="total" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Payment Method Breakdown</p>
        <div className="mt-2 space-y-2">
          {methods.map((method) => {
            const percent = totalMethods ? (Number(method.total || 0) / totalMethods) * 100 : 0;
            return (
              <div key={method._id}>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{method._id}</span>
                  <span>{money(method.total)} ({percent.toFixed(0)}%)</span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-slate-800">
                  <div className="h-1.5 rounded bg-teal-400" style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Top Patients This Month ({currentMonthLabel || '--'})</p>
        <div className="mt-2 space-y-2">
          {topPatients.map((entry) => (
            <button key={entry._id} type="button" onClick={() => onSelectPatient(entry._id)} className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-slate-800/70">
              <span className="text-xs text-slate-200">{entry.patient?.name || '--'}</span>
              <span className="text-xs text-teal-300">{money(entry.total)}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default RevenueOverviewPanel;

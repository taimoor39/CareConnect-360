import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function RevenueChart({ data, period, onChangePeriod }) {
  const failed = data === null;
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Revenue Overview</h3>
          <p className="text-xs text-slate-400">{period === '1m' ? 'Last month' : period === '3m' ? 'Last 3 months' : 'Last 6 months'}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-700 p-1">
          {['6m', '3m', '1m'].map((p) => (
            <button key={p} type="button" onClick={() => onChangePeriod(p)} className={`rounded px-2 py-1 text-xs ${period === p ? 'bg-teal-500 text-slate-900' : 'text-slate-300'}`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {failed ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">Chart data unavailable</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
              formatter={(value, name) => [`Rs. ${Number(value || 0).toLocaleString()}`, name === 'invoiced' ? 'Total Invoiced' : 'Collected']}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <Bar dataKey="invoiced" fill="#0d9488" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Line dataKey="collected" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default RevenueChart;

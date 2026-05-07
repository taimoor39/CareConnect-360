function Card({ title, value, sub, tone = 'text-white' }) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </article>
  );
}

function DoctorStatCards({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card title="TODAY'S PATIENTS" value={stats.todayCount || 0} sub={stats.todaySub || ''} tone="text-teal-300" />
      <Card title="THIS WEEK" value={stats.weekCount || 0} sub={stats.weekSub || ''} tone="text-sky-300" />
      <Card title="PENDING SUMMARIES" value={stats.pendingSummaries || 0} sub="Awaiting your review" tone="text-amber-300" />
      <Card title="TOTAL PATIENTS" value={stats.totalPatients || 0} sub="Patients seen overall" tone="text-white" />
    </div>
  );
}

export default DoctorStatCards;


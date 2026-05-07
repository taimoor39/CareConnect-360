function AppointmentStatCards({ stats = {}, loading = false }) {
  const cards = [
    { title: "TODAY'S APPOINTMENTS", value: stats.todayTotal || 0, note: 'Scheduled for today', color: 'text-white' },
    { title: 'SCHEDULED', value: stats.scheduled || 0, note: 'Upcoming appointments', color: 'text-teal-300' },
    { title: 'COMPLETED TODAY', value: stats.completedToday || 0, note: 'Finished today', color: 'text-emerald-300' },
    { title: 'MISSED TODAY', value: stats.missedToday || 0, note: 'Require follow-up', color: 'text-amber-300' },
  ];

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="glass-panel rounded-2xl p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-800" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-800" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article className="glass-panel rounded-2xl p-5" key={card.title}>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">{card.title}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          <p className="mt-1 text-xs text-slate-400">{card.note}</p>
        </article>
      ))}
    </section>
  );
}

export default AppointmentStatCards;

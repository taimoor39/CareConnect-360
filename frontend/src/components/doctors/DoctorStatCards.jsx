function DoctorStatCards({ stats = {}, staffStats = {}, loading = false }) {
  const cards = [
    { title: 'TOTAL DOCTORS', value: stats.totalDoctors || 0, note: 'All doctor users in system', color: 'text-white' },
    { title: 'TOTAL RECEPTIONISTS', value: staffStats.totalReceptionists || 0, note: 'All receptionist users in system', color: 'text-sky-300' },
    { title: 'STAFF ON DUTY', value: staffStats.activeReceptionists || 0, note: 'Currently active', color: (staffStats.activeReceptionists || 0) > 0 ? 'text-teal-300' : 'text-amber-300' },
  ];

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article key={card.title} className="glass-panel rounded-2xl p-5">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">{card.title}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          <p className="mt-1 text-xs text-slate-400">{card.note}</p>
        </article>
      ))}
    </section>
  );
}

export default DoctorStatCards;

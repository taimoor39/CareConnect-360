function UserStatCards({ stats, loading = false }) {
  const cards = [
    { title: 'TOTAL USERS', value: stats.totalUsers, note: 'Updated from current database snapshot', color: 'text-white' },
    { title: 'ACTIVE USERS', value: stats.activeUsers, note: 'Users currently enabled for access', color: 'text-teal-300' },
    { title: 'ROLES', value: '4 Roles', note: 'Admin, Doctor, Receptionist, Patient', color: 'text-sky-300' },
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

export default UserStatCards;

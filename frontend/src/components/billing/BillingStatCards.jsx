const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function BillingStatCards({ stats = {}, loading = false }) {
  const cards = [
    { title: 'TOTAL INVOICES', value: Number(stats.totalInvoices || 0).toLocaleString(), note: 'All time', color: 'text-white' },
    { title: 'TOTAL REVENUE', value: formatMoney(stats.totalRevenue), note: 'Collected to date', color: 'text-teal-300' },
    { title: 'PENDING AMOUNT', value: formatMoney(stats.pendingAmount), note: 'Outstanding balance', color: 'text-amber-300' },
    { title: 'THIS MONTH', value: formatMoney(stats.thisMonthTotal), note: 'Revenue this month', color: 'text-emerald-300' },
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
        <article key={card.title} className="glass-panel rounded-2xl p-5">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">{card.title}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          <p className="mt-1 text-xs text-slate-400">{card.note}</p>
        </article>
      ))}
    </section>
  );
}

export default BillingStatCards;

const cardClass = 'glass-panel rounded-2xl p-5';

function ReceptionistStatCards({ stats, loading }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={cardClass}>
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">TODAY&apos;S APPOINTMENTS</p>
        <p className="mt-2 text-2xl font-semibold text-teal-300">{loading ? '—' : stats.todayTotal ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">
          {loading ? '…' : `${stats.checkedInToday ?? 0} seen / in progress, ${stats.remainingToday ?? 0} remaining`}
        </p>
      </article>
      <article className={cardClass}>
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">WAITING</p>
        <p className="mt-2 text-2xl font-semibold text-amber-300">{loading ? '—' : stats.waitingCount ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">Checked in, awaiting doctor</p>
      </article>
      <article className={cardClass}>
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">REGISTERED TODAY</p>
        <p className="mt-2 text-2xl font-semibold text-sky-300">{loading ? '—' : stats.registeredToday ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">New patients (local midnight)</p>
      </article>
      <article className={cardClass}>
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">PENDING PAYMENTS</p>
        <p className="mt-2 text-2xl font-semibold text-rose-300">{loading ? '—' : stats.pendingPayments ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">Invoices outstanding</p>
      </article>
    </section>
  );
}

export default ReceptionistStatCards;

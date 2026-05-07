import { useNavigate } from 'react-router-dom';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function KPIStatCards({ data }) {
  const navigate = useNavigate();
  const failed = !data;
  const kpi = data || {};
  const missed = Number(kpi.missedToday || 0);

  const cards = [
    {
      label: 'TOTAL PATIENTS',
      value: kpi.totalPatients,
      trend: `${kpi.newPatientsThisWeek || 0} new this week`,
      color: 'text-white',
      onClick: () => navigate('/patients'),
    },
    {
      label: "TODAY'S APPOINTMENTS",
      value: kpi.todayAppointments,
      trend: `${kpi.todayCompleted || 0} completed, ${kpi.todayRemaining || 0} remaining`,
      color: 'text-teal-300',
      onClick: () => navigate('/appointments?date=today'),
    },
    {
      label: 'ACTIVE DOCTORS',
      value: kpi.activeDoctors,
      trend: `${kpi.completeDoctors || 0} profiles complete`,
      color: 'text-sky-300',
      onClick: () => navigate('/doctors'),
    },
    {
      label: 'REVENUE TODAY',
      value: money(kpi.revenueToday || 0),
      trend: `${(kpi.revenueDiff || 0) >= 0 ? '+' : '-'}${money(Math.abs(kpi.revenueDiff || 0))} vs yesterday`,
      color: 'text-emerald-300',
      onClick: () => navigate('/billing'),
    },
    {
      label: 'PENDING INVOICES',
      value: kpi.pendingInvoicesCount,
      trend: `${money(kpi.pendingAmount || 0)} outstanding`,
      color: 'text-amber-300',
      onClick: () => navigate('/billing?status=Unpaid'),
    },
    {
      label: 'MISSED TODAY',
      value: missed,
      trend: missed > 0 ? 'Require follow-up' : 'All patients attended',
      color: missed > 0 ? 'text-rose-300' : 'text-emerald-300',
      onClick: () => navigate('/appointments?status=Missed'),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <button key={card.label} type="button" onClick={card.onClick} className="glass-panel flex min-h-[9rem] flex-col rounded-2xl p-5 text-left transition hover:border-teal-300/30 hover:bg-slate-900/80">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{failed ? '—' : card.value}</p>
          <div className="mt-auto flex min-h-[1.75rem] items-end">
            <p className={`text-xs ${failed ? 'text-rose-300' : 'text-slate-300'}`}>{failed ? 'Failed to load' : card.trend}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default KPIStatCards;

import { useNavigate } from 'react-router-dom';

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    ['Register Patient', '/patients'],
    ['Book Appointment', '/appointments'],
    ['Add Doctor / Staff', '/doctors'],
    ['Generate Invoice', '/billing'],
    ['Add User', '/users'],
    ['View Analytics', '/analytics'],
  ];
  return (
    <div>
      <h3 className="text-base font-semibold text-white">Quick Actions</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map(([label, path]) => (
          <button key={label} type="button" onClick={() => navigate(path)} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-3 text-xs text-teal-200 hover:border-teal-300/40">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;

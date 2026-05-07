import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const titles = {
  doctor: 'Doctor Workspace',
  receptionist: 'Receptionist Workspace',
  patient: 'Patient Workspace',
};

function RoleDashboard({ role }) {
  const navigate = useNavigate();
  const title = useMemo(() => titles[role] || 'Workspace', [role]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">
          Login and role-based access are now working. This role-specific dashboard can be expanded with dedicated features.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('careconnect360_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
          }}
          className="mt-5 rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 hover:bg-teal-400/20"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}

export default RoleDashboard;

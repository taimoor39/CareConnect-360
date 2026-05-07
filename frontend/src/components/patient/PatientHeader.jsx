import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../../utils/authUser.js';

function firstNameFrom(patient, user) {
  if (patient?.firstName) return patient.firstName;
  const n = patient?.name || user?.name || '';
  return String(n).split(/\s+/)[0] || 'there';
}

function PatientHeader({ title, patient, user }) {
  const navigate = useNavigate();
  const hello = firstNameFrom(patient, user);

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/60 bg-slate-950/40 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-teal-200">PATIENT PORTAL</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-300">
          Hello, <span className="font-medium text-white">{hello}</span> 👋
        </p>
        <button
          type="button"
          onClick={() => {
            clearAuthSession();
            navigate('/login', { replace: true });
          }}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-400/50 hover:text-teal-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default PatientHeader;

import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/careconnect-logo.png';

const items = [
  { label: 'My Dashboard', icon: '🏠', path: '/patient/dashboard' },
  { label: 'My Appointments', icon: '📅', path: '/patient/appointments' },
  { label: 'My Prescriptions', icon: '💊', path: '/patient/prescriptions' },
  { label: 'My Reports', icon: '📄', path: '/patient/reports' },
  { label: 'My Invoices', icon: '💰', path: '/patient/invoices' },
  { label: 'My Profile', icon: '👤', path: '/patient/profile' },
];

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  const a = parts[0]?.[0] || 'P';
  const b = parts[1]?.[0] || '';
  return `${a}${b}`.toUpperCase();
}

function PatientSidebar({ patient }) {
  const location = useLocation();
  const displayName = patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Patient';
  const code = patient?.patientId || patient?.patientCode || '—';

  const navClass = (path) =>
    `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
      location.pathname === path
        ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;

  return (
    <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-950 via-[#04142d] to-slate-950 px-4 py-8 backdrop-blur-xl lg:flex">
      <div className="px-1">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CareConnect 360 logo" className="h-8 w-8 rounded-md object-contain" />
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal-200/90">CARECONNECT360</p>
        </div>
        <p className="mt-1 text-lg font-semibold tracking-tight text-white">PATIENT PORTAL</p>
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-2xl font-semibold text-slate-950 shadow-lg shadow-teal-900/40">
          {initials(displayName)}
        </div>
        <p className="mt-4 max-w-[14rem] text-sm font-semibold leading-snug text-white">{displayName}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{code}</p>
      </div>

      <nav className="app-scrollbar mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => (
          <Link key={item.path} to={item.path} className={navClass(item.path)}>
            {location.pathname === item.path ? (
              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-teal-400" />
            ) : null}
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-800/80 pt-4" />
    </aside>
  );
}

export default PatientSidebar;

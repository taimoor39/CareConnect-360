import { Link, useLocation } from 'react-router-dom';
import { getAuthUser } from '../../utils/authUser.js';
import logo from '../../assets/careconnect-logo.png';

const items = [
  { label: 'My Dashboard', path: '/doctor/dashboard', icon: '🏠' },
  { label: 'My Schedule', path: '/doctor/schedule', icon: '📅' },
  { label: 'My Patients', path: '/doctor/patients', icon: '👥' },
  { label: 'Consultations', path: '/doctor/consultations', icon: '📝' },
  { label: 'Reports', path: '/doctor/reports', icon: '📄' },
  { label: 'Prescriptions', path: '/doctor/prescriptions', icon: '💊' },
  { label: 'My Profile', path: '/doctor/profile', icon: '👤' },
];

function DoctorSidebar() {
  const location = useLocation();
  const auth = getAuthUser();
  const doctorName = auth.name || 'Doctor';

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[17rem] flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-[#04142d] to-slate-950 p-5 backdrop-blur-xl lg:flex">
        <div className="rounded-2xl border border-teal-300/20 bg-gradient-to-br from-sky-500/10 via-slate-900/50 to-teal-500/15 p-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CareConnect 360 logo" className="h-8 w-8 rounded-md object-contain" />
            <p className="text-xs tracking-[0.16em] text-teal-100">CARECONNECT360</p>
          </div>
          <h2 className="mt-2 font-display text-lg text-white">DOCTOR PORTAL</h2>
        </div>

        <nav className="app-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mt-2 flex flex-col gap-1.5">
            {items.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex min-h-[2.75rem] items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  {active ? <span className="absolute left-0 top-[0.4rem] h-[1.8rem] w-[0.14rem] rounded-full bg-teal-300" /> : null}
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-3 border-t border-slate-800/80 pt-3">
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/80 text-[0.7rem] font-semibold text-white">
                {String(doctorName)
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'D'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.75rem] font-medium text-slate-100">Dr. {doctorName}</p>
                <p className="text-[0.625rem] tracking-[0.08em] text-sky-300">DOCTOR</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default DoctorSidebar;


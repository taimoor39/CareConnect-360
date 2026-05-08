import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPortalAccessStats } from '../api/portalAccess.js';
import { getAuthUser } from '../utils/authUser.js';

const iconClass = 'h-4 w-4';

const DashboardIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const PatientsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.8-2.7 2.8-4.5 5.5-4.5s4.7 1.8 5.5 4.5M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14.5 18.5c.5-1.8 1.8-3.2 3.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const UsersIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="8.5" cy="8" r="2.7" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.9-2.6 2.8-4.2 5-4.2s4.1 1.6 5 4.2M13.8 18.5c.5-1.8 1.7-3.1 3.6-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const DoctorsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AppointmentsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const BillingIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const AnalyticsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 19V6m5 13V10m5 9V4m5 15v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AuditLogsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6 4h9l3 3v13H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M15 4v3h3M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = ({ className = iconClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7.3 7.3 0 0 0-1.8-1l-.4-2.5h-4l-.4 2.5a7.3 7.3 0 0 0-1.8 1l-2.4-.8-2 3.5 2 1.5a7 7 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-.8a7.3 7.3 0 0 0 1.8 1l.4 2.5h4l.4-2.5a7.3 7.3 0 0 0 1.8-1l2.4.8 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuthUser();
  const adminName = auth.name || 'Admin';
  const adminRole = String(auth.role || 'admin').toUpperCase();
  const [pendingPortalRequests, setPendingPortalRequests] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchPending = () => {
      getPortalAccessStats()
        .then((r) => setPendingPortalRequests(Number(r.data?.data?.pending || 0)))
        .catch(() => {});
    };

    fetchPending();
    const interval = setInterval(fetchPending, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
    { label: 'Patients', path: '/patients', icon: PatientsIcon },
    { label: 'Users', path: '/users', icon: UsersIcon, badge: pendingPortalRequests },
    { label: 'Doctors', path: '/doctors', icon: DoctorsIcon },
    { label: 'Appointments', path: '/appointments', icon: AppointmentsIcon },
    { label: 'Billing', path: '/billing', icon: BillingIcon },
    { label: 'Analytics', path: '/analytics', icon: AnalyticsIcon },
    { label: 'Audit Logs', path: '/audit', icon: AuditLogsIcon },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const navClass = (path) =>
    `group relative w-full rounded-lg px-3 py-2.5 text-left text-xs transition ${
      location.pathname === path
        ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30'
        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
    }`;

  const handleSignOut = () => {
    localStorage.removeItem('careconnect360_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <aside className={`sticky top-0 hidden h-screen flex-col border-r border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-xl transition-all duration-200 lg:flex ${collapsed ? 'w-[5.5rem]' : 'w-[17rem]'}`}>
        <div className="rounded-2xl border border-teal-300/20 bg-gradient-to-br from-teal-500/20 to-sky-500/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.16em] text-teal-100">CC360</p>
              {!collapsed ? (
                <>
                  <h2 className="mt-1 font-display text-sm text-white">CareConnect 360</h2>
                  <p className="text-[0.625rem] tracking-[0.12em] text-slate-300">ADMIN PORTAL</p>
                </>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-300/20 bg-slate-900/30 text-slate-100 transition hover:bg-slate-800/70"
            >
              <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
            </button>
          </div>
        </div>

        <nav className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <div>
            {!collapsed ? <p className="px-2 text-[0.6875rem] uppercase tracking-[0.16em] text-slate-400">MANAGEMENT</p> : null}
            <div className="mt-2 flex flex-col gap-1.5">
              {items.map((item, idx) => (
                <div key={item.path}>
                  {idx === items.length - 1 ? <div className="my-1 border-t border-slate-700/60" /> : null}
                  <Link
                    to={item.path}
                    className={`${navClass(item.path)} flex items-center ${collapsed ? 'justify-center' : 'gap-2'} whitespace-nowrap pl-3 pr-2 text-sm`}
                  >
                    {location.pathname === item.path ? <span className="absolute left-0 top-[0.4rem] h-[1.8rem] w-[0.14rem] rounded-full bg-teal-300" /> : null}
                    <span className={`${location.pathname === item.path ? 'text-teal-100' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {item.icon({ className: 'h-[1rem] w-[1rem]' })}
                    </span>
                    {!collapsed ? <span>{item.label}</span> : null}
                    {!collapsed && item.badge > 0 ? (
                      <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3">
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/80 text-[0.7rem] font-semibold text-white">
                {String(adminName).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'A'}
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-[0.75rem] font-medium text-slate-100">{adminName}</p>
                  <p className="text-[0.625rem] tracking-[0.08em] text-teal-300">{adminRole}</p>
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign Out"
            className={`inline-flex w-full items-center rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20 ${collapsed ? 'justify-center' : 'gap-2'}`}
          >
            <span aria-hidden="true">↩</span>
            {!collapsed ? <span>Sign Out</span> : null}
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-900/70 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-9 gap-1 rounded-t-2xl border border-white/10 bg-slate-900/65 p-1 shadow-[0_-0.5rem_2rem_rgba(0,0,0,0.35)]">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-h-[2.75rem] flex-col items-center justify-center rounded-xl px-1 text-center text-[0.6875rem] transition ${
                  active ? 'bg-teal-400/20 text-teal-100' : 'text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <span className="text-[0.75rem]">{item.icon({ className: 'h-3.5 w-3.5' })}</span>
                <span className="mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
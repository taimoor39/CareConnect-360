import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { clearAuthSession } from '../utils/authUser.js';

const LogoutIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M9 4.5H6.8A2.8 2.8 0 0 0 4 7.3v9.4a2.8 2.8 0 0 0 2.8 2.8H9M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function DashboardLayout({
  title,
  subtitle = 'ADMIN PORTAL',
  subline = '',
  headerActions = null,
  children,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 text-sm lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Sidebar />

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 shrink-0 border-b border-slate-800/80 bg-slate-950/75 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-h-[2.75rem] flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-teal-200">{subtitle}</p>
                <h1 className="font-display text-xl text-white">{title}</h1>
                {subline ? <p className="mt-0.5 text-[0.6875rem] text-slate-400">{subline}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
                >
                  <LogoutIcon />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="min-w-full space-y-6 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default DashboardLayout;

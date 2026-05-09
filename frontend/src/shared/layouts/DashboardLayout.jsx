import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar.jsx';
import PageHeader from '@/shared/components/PageHeader.jsx';
import { clearAuthSession } from '@/utils/authUser.js';

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
    <div
      className="flex h-screen max-h-screen min-h-0 overflow-hidden text-sm text-slate-100"
      style={{ background: 'var(--bg-primary)' }}
    >
      <Sidebar />
      <main
        id="main-content"
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <PageHeader
          eyebrow={subtitle}
          title={title}
          subtitle={subline || undefined}
          rightContent={
            <>
              {headerActions}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
              >
                <LogoutIcon />
                Logout
              </button>
            </>
          }
        />
        <div style={{ padding: '24px 32px' }} className="space-y-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;

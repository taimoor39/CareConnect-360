import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '@/utils/authUser.js';
import ReceptionistSidebar from '@/components/receptionist/ReceptionistSidebar.jsx';
import PageHeader from '@/shared/components/PageHeader.jsx';

function ReceptionistLayout({ title, children, headerActions = null, subline = '' }) {
  const navigate = useNavigate();

  const logout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="flex h-screen max-h-screen min-h-0 overflow-hidden text-sm text-slate-100"
      style={{ background: 'var(--bg-primary)' }}
    >
      <ReceptionistSidebar />
      <main
        id="main-content"
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <PageHeader
          eyebrow="RECEPTIONIST PORTAL"
          title={title}
          subtitle={subline || undefined}
          rightContent={
            <>
              {headerActions}
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
              >
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

export default ReceptionistLayout;


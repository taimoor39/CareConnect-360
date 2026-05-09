import { useNavigate } from 'react-router-dom';
import DoctorSidebar from '@/components/doctor/DoctorSidebar.jsx';
import PageHeader from '@/shared/components/PageHeader.jsx';
import { clearAuthSession } from '@/utils/authUser.js';

function DoctorLayout({ title, children, headerActions = null }) {
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
      <DoctorSidebar />
      <main
        id="main-content"
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <PageHeader
          eyebrow="DOCTOR PORTAL"
          title={title}
          rightContent={
            <>
              {headerActions}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
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

export default DoctorLayout;


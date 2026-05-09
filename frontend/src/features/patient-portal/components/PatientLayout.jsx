import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyProfile } from '@/api/patientPortal.js';
import { clearAuthSession } from '@/utils/authUser.js';
import PageHeader from '@/shared/components/PageHeader.jsx';
import PatientSidebar from './PatientSidebar.jsx';

const titles = {
  '/patient/dashboard': 'My Dashboard',
  '/patient/appointments': 'My Appointments',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/reports': 'My Reports',
  '/patient/invoices': 'My Invoices',
  '/patient/profile': 'My Profile',
};

function logoutAndLogin(navigate) {
  clearAuthSession();
  navigate('/login', { replace: true });
}

function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = titles[location.pathname] || 'Patient Portal';
  const [patient, setPatient] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyProfile();
        if (cancelled) return;
        setPatient(res.data?.data?.patient || null);
        setUser(res.data?.data?.user || null);
        setNotLinked(false);
      } catch (e) {
        if (cancelled) return;
        if (e.response?.status === 404) {
          setNotLinked(true);
        } else {
          toast.error('Failed to load. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (notLinked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-200">
        <p className="max-w-md text-lg font-medium text-white">Your patient record is being set up.</p>
        <p className="mt-3 max-w-md text-sm text-slate-400">Please contact reception if this persists.</p>
        <button type="button" onClick={() => logoutAndLogin(navigate)} className="care-btn-primary mt-8">
          Logout
        </button>
      </div>
    );
  }

  const mobileLogout = (
    <button
      type="button"
      onClick={() => logoutAndLogin(navigate)}
      className="rounded-[var(--radius-md)] border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-500/35 hover:text-teal-100 lg:hidden"
    >
      Logout
    </button>
  );

  return (
    <div className="relative h-screen max-h-screen min-h-0 overflow-hidden text-slate-100" style={{ background: 'var(--bg-primary)' }}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,1),#020617)]" />
      <div className="relative z-[1] flex h-full min-h-0 w-full overflow-hidden">
        <PatientSidebar patient={patient} />
        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
        >
          <PageHeader eyebrow="PATIENT PORTAL" title={title} rightContent={mobileLogout} />
          <div style={{ padding: '24px 32px' }} className="pb-28 lg:pb-10">
            {loading ? (
              <div className="mx-auto max-w-2xl space-y-4 py-10">
                <div className="skeleton h-36 w-full rounded-[var(--radius-lg)]" />
                <div className="skeleton h-24 w-full rounded-[var(--radius-lg)]" />
                <div className="skeleton h-24 w-full rounded-[var(--radius-lg)]" />
              </div>
            ) : (
              <Outlet context={{ patient, user, setPatient }} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PatientLayout;

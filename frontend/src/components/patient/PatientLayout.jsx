import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyProfile } from '../../api/patientPortal.js';
import { clearAuthSession } from '../../utils/authUser.js';
import PatientHeader from './PatientHeader.jsx';
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
        <button
          type="button"
          onClick={() => logoutAndLogin(navigate)}
          className="mt-8 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-slate-950"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,1),#020617)]" />
      <div className="relative flex min-h-screen">
        <PatientSidebar patient={patient} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <PatientHeader title={title} patient={patient} user={user} />
          <div className="flex-1 px-4 py-8 sm:px-8">
            {loading ? (
              <div className="flex justify-center py-20 text-slate-400">Loading your portal…</div>
            ) : (
              <Outlet context={{ patient, user, setPatient }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientLayout;

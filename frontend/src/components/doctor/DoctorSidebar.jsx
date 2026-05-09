import AppSidebar from '@/shared/components/AppSidebar.jsx';
import { getAuthUser } from '../../utils/authUser.js';

const ic = 'h-[18px] w-[18px] shrink-0';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const ScheduleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PatientsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.8-2.7 2.8-4.5 5.5-4.5s4.7 1.8 5.5 4.5M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14.5 18.5c.5-1.8 1.8-3.2 3.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ConsultationsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 11h6M9 14h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M6 4h9l3 3v13H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M15 4v3h3M9 12h6M9 15h6M9 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PrescriptionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="3.5" y="7" width="17" height="10" rx="5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7v10M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4.5 19.5c1-3.2 3.6-5 7.5-5s6.5 1.8 7.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const navItems = [
  { label: 'My Dashboard', path: '/doctor/dashboard', icon: <DashboardIcon />, exact: true },
  { label: 'My Schedule', path: '/doctor/schedule', icon: <ScheduleIcon /> },
  { label: 'My Patients', path: '/doctor/patients', icon: <PatientsIcon /> },
  { label: 'Consultations', path: '/doctor/consultations', icon: <ConsultationsIcon /> },
  { label: 'Reports', path: '/doctor/reports', icon: <ReportsIcon /> },
  { label: 'Prescriptions', path: '/doctor/prescriptions', icon: <PrescriptionIcon /> },
  { label: 'My Profile', path: '/doctor/profile', icon: <ProfileIcon /> },
];

function DoctorSidebar() {
  const auth = getAuthUser();
  const rawName = auth.name || 'Doctor';
  const shortName = rawName.replace(/^Dr\.\s*/i, '').trim() || 'Doctor';

  return (
    <AppSidebar
      navItems={navItems}
      portalLabel="CLINICAL"
      portalSubtitle="DOCTOR PORTAL"
      roleColor="#2563eb"
      collapseStorageKey="cc360_sidebar_doctor"
      displayName={`Dr. ${shortName}`}
      displayRole="doctor"
      showMobileNav
      mobileNavCols={7}
    />
  );
}

export default DoctorSidebar;

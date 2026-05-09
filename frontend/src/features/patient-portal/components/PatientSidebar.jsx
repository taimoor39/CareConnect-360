import AppSidebar from '@/shared/components/AppSidebar.jsx';

const ic = 'h-[18px] w-[18px] shrink-0';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const AppointmentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PrescriptionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="3.5" y="7" width="17" height="10" rx="5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7v10M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M6 4h9l3 3v13H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M15 4v3h3M9 12h6M9 15h6M9 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const InvoicesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4.5 19.5c1-3.2 3.6-5 7.5-5s6.5 1.8 7.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const navItems = [
  { label: 'My Dashboard', path: '/patient/dashboard', icon: <DashboardIcon />, exact: true },
  { label: 'My Appointments', path: '/patient/appointments', icon: <AppointmentsIcon /> },
  { label: 'My Prescriptions', path: '/patient/prescriptions', icon: <PrescriptionIcon /> },
  { label: 'My Reports', path: '/patient/reports', icon: <ReportsIcon /> },
  { label: 'My Invoices', path: '/patient/invoices', icon: <InvoicesIcon /> },
  { label: 'My Profile', path: '/patient/profile', icon: <ProfileIcon /> },
];

function PatientSidebar({ patient }) {
  const displayName = patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Patient';

  return (
    <AppSidebar
      navItems={navItems}
      portalLabel="PATIENT PORTAL"
      portalSubtitle=""
      roleColor="#16a34a"
      collapseStorageKey="cc360_sidebar_patient"
      showMobileNav
      mobileNavCols={6}
      displayName={displayName}
      displayRole="patient"
    />
  );
}

export default PatientSidebar;

import AppSidebar from '@/shared/components/AppSidebar.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { AppointmentsIcon, BillingIcon, DashboardIcon, PatientsIcon, QRCodeIcon } from './icons.jsx';

const ic = 'h-[18px] w-[18px] shrink-0';

const navItems = [
  { label: 'Dashboard', path: '/receptionist/dashboard', icon: <DashboardIcon className={ic} />, exact: true },
  { label: 'Patients', path: '/receptionist/patients', icon: <PatientsIcon className={ic} /> },
  { label: 'Appointments', path: '/receptionist/appointments', icon: <AppointmentsIcon className={ic} /> },
  { label: 'QR Check-In', path: '/receptionist/checkin', icon: <QRCodeIcon className={ic} /> },
  { label: 'Billing', path: '/receptionist/billing', icon: <BillingIcon className={ic} /> },
];

function ReceptionistSidebar() {
  const auth = getAuthUser();

  return (
    <AppSidebar
      navItems={navItems}
      portalLabel="RECEPTION"
      portalSubtitle="RECEPTIONIST PORTAL"
      roleColor="#d97706"
      collapseStorageKey="cc360_sidebar_receptionist"
      displayName={auth.name || 'Receptionist'}
      displayRole="receptionist"
      showMobileNav
      mobileNavCols={5}
    />
  );
}

export default ReceptionistSidebar;

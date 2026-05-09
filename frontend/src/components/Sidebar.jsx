import { useEffect, useMemo, useState } from 'react';

import { getPortalAccessStats } from '../api/portalAccess.js';
import { adminRefreshMatchesScopes, subscribeAdminRealtime } from '../utils/adminRealtimeClient.js';
import AppSidebar from '@/shared/components/AppSidebar.jsx';
import { getAuthUser } from '../utils/authUser.js';

const ic = 'h-[18px] w-[18px] shrink-0';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const PatientsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.8-2.7 2.8-4.5 5.5-4.5s4.7 1.8 5.5 4.5M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14.5 18.5c.5-1.8 1.8-3.2 3.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <circle cx="8.5" cy="8" r="2.7" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.9-2.6 2.8-4.2 5-4.2s4.1 1.6 5 4.2M13.8 18.5c.5-1.8 1.7-3.1 3.6-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const DoctorsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AppointmentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const BillingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M4 19V6m5 13V10m5 9V4m5 15v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AuditLogsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M6 4h9l3 3v13H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M15 4v3h3M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true">
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7.3 7.3 0 0 0-1.8-1l-.4-2.5h-4l-.4 2.5a7.3 7.3 0 0 0-1.8 1l-2.4-.8-2 3.5 2 1.5a7 7 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-.8a7.3 7.3 0 0 0 1.8 1l.4 2.5h4l.4-2.5a7.3 7.3 0 0 0 1.8-1l2.4.8 2-3.5-2-1.5c.1-.3.1-.7.1-1Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Sidebar() {
  const auth = getAuthUser();
  const [pendingPortalRequests, setPendingPortalRequests] = useState(0);

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

  useEffect(() => {
    return subscribeAdminRealtime((payload) => {
      if (!adminRefreshMatchesScopes(payload, ['portalBadge'])) return;
      getPortalAccessStats()
        .then((r) => setPendingPortalRequests(Number(r.data?.data?.pending || 0)))
        .catch(() => {});
    });
  }, []);

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, exact: true },
      { label: 'Patients', path: '/patients', icon: <PatientsIcon /> },
      { label: 'Users', path: '/users', icon: <UsersIcon />, badge: pendingPortalRequests },
      { label: 'Doctors', path: '/doctors', icon: <DoctorsIcon /> },
      { label: 'Appointments', path: '/appointments', icon: <AppointmentsIcon /> },
      { label: 'Billing', path: '/billing', icon: <BillingIcon /> },
      { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
      { label: 'Audit Logs', path: '/audit', icon: <AuditLogsIcon /> },
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ],
    [pendingPortalRequests],
  );

  return (
    <AppSidebar
      navItems={navItems}
      portalLabel="MANAGEMENT"
      portalSubtitle="ADMIN PORTAL"
      roleColor="#0d9488"
      collapseStorageKey="cc360_sidebar_admin"
      displayName={auth.name || 'Admin'}
      displayRole={auth.role || 'admin'}
      showMobileNav
      mobileNavCols={9}
    />
  );
}

export default Sidebar;

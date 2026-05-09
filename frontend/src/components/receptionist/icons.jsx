// Professional SVG icons for the Receptionist Portal — same styling and
// stroke-width conventions as the Admin sidebar so the two portals feel
// like one cohesive product.

const baseClass = 'h-4 w-4';

export const DashboardIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const PatientsIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 18.5c.8-2.7 2.8-4.5 5.5-4.5s4.7 1.8 5.5 4.5M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14.5 18.5c.5-1.8 1.8-3.2 3.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const AppointmentsIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const QRCodeIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <path d="M14 14h2.5v2.5H14zM18 14h2.5v2.5H18zM14 18h2.5v2.5H14zM18 18h2.5v2.5H18z" fill="currentColor" />
    <path d="M6 6h1.5v1.5H6zM16.5 6H18v1.5h-1.5zM6 16.5h1.5V18H6z" fill="currentColor" />
  </svg>
);

export const BillingIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const CameraIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 8.5A2 2 0 0 1 6 6.5h2.4l1.4-2.1A1 1 0 0 1 10.6 4h2.8a1 1 0 0 1 .8.4l1.4 2.1H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const UploadIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 16v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ImageIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="m4 18 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KeyboardIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M18 10h.01M6.5 13h.01M9.5 13h.01M15.5 13h.01M18 13h.01M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const CheckCircleIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ErrorCircleIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7v6M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const InfoIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 11v5M12 7.8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const ClockIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const StethoscopeIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6 4v6a4 4 0 0 0 8 0V4M6 4h2M14 4h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M10 14v2a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="18" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const SparkleIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7l-2.8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ScanLineIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16M3.5 12h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const RefreshIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrashIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 7h14M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M7 7l1 12.5A2 2 0 0 0 10 21h4a2 2 0 0 0 2-1.5L17 7M10.5 10.5v6M13.5 10.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const LogoutIcon = ({ className = baseClass }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M11 12h10M17 8l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

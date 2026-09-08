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

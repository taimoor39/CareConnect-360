/** Minimal stroke icons for Settings sidebar (inherit `currentColor`). */
const ic = 'h-[18px] w-[18px] shrink-0';

export function IconGeneralSecurity(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <path
        d="M12 3 20 7v5c0 5-3.5 9.5-8 10.5C7.5 22.5 4 18 4 12V7l8-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12.5 11 14.5 15 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEmail(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7.5 12 13 20 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCronJobs(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3.5V2M12 22v-1.5M20.5 12H22M2 12h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconClinic(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <path d="M4 21V10l4-2v13M4 21h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8V4h8v4M8 21V12h8v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 15h2M11 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 6v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconAIService(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconMedicalTerms(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <path d="M8 4h10a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 9h6M10 12h6M10 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconChangePassword(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} aria-hidden="true" {...props}>
      <circle cx="8.5" cy="15.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 13 21 4M21 4v3.5h-3M18 4v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

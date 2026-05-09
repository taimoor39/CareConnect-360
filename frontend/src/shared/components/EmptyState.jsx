/**
 * Step 10 — consistent empty state (icon ~40px in 48px circle).
 */
function EmptyState({ icon, title, subtitle }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        color: 'var(--text-muted)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export default EmptyState;

/** Default muted inbox / document glyph */
export function EmptyStateIconInbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="40" height="40" aria-hidden="true">
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M4 9h16M9 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateIconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="40" height="40" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 3.8v2.8M16 3.8v2.8M4 9.5h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateIconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="40" height="40" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

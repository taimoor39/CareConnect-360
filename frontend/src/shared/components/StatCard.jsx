function StatCard({ label, value, sub, valueColor = 'var(--text-primary)', icon, onClick }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        flex: 1,
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'rgba(13,148,136,0.25)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        {icon ? (
          <div style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{icon}</div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 8,
            fontWeight: 400,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export default StatCard;

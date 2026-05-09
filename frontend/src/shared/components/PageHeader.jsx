function PageHeader({ eyebrow, title, subtitle, rightContent }) {
  return (
    <div
      style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        background: 'var(--bg-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--teal)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: '4px 0 0',
              fontWeight: 300,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {rightContent ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {rightContent}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;

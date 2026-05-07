function PortalAccessToggle({
  requestPortalAccess,
  setRequestPortalAccess,
  portalEmail,
  setPortalEmail,
  portalEmailError,
  setPortalEmailError,
  disabled = false,
}) {
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: requestPortalAccess ? 16 : 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
        onClick={() => {
          if (disabled) return;
          setRequestPortalAccess(!requestPortalAccess);
          setPortalEmailError('');
        }}
      >
        <div style={{ width: 44, height: 24, borderRadius: 12, background: requestPortalAccess ? '#0d9488' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: requestPortalAccess ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>Request patient portal access</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Patient will receive login instructions by email after admin approval
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 100, color: '#5eead4', whiteSpace: 'nowrap' }}>
          Admin approval required
        </div>
      </div>

      {requestPortalAccess && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Portal Login Email *
          </label>
          <input
            type="email"
            value={portalEmail}
            onChange={(e) => {
              setPortalEmail(e.target.value);
              setPortalEmailError('');
            }}
            onBlur={() => {
              if (!portalEmail) {
                setPortalEmailError('Email is required for portal access');
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalEmail)) {
                setPortalEmailError('Enter a valid email address');
              }
            }}
            placeholder="patient@email.com"
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${portalEmailError ? 'rgba(248,113,113,0.4)' : 'rgba(148,163,184,0.1)'}`,
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 14,
              outline: 'none',
            }}
          />
          {portalEmailError ? <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{portalEmailError}</div> : null}
        </div>
      )}
    </div>
  );
}

export default PortalAccessToggle;

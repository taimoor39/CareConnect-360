import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import logoSrc from '@/assets/logo.png';
import { clearAuthSession, getAuthUser } from '@/utils/authUser.js';

function readStoredCollapsed(key) {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Universal sidebar (REF-1). Same structure for Admin, Doctor, Receptionist, Patient.
 * @param {{ path: string, label: string, icon: React.ReactNode, badge?: number, exact?: boolean }[]} navItems
 */
function AppSidebar({
  navItems,
  portalLabel,
  portalSubtitle = '',
  roleColor = '#0d9488',
  showMobileNav = false,
  mobileNavCols = 9,
  displayName: displayNameProp,
  displayRole: displayRoleProp,
  /** Per-portal key so collapse state survives navigation and remounts */
  collapseStorageKey = 'cc360_sidebar_collapsed',
}) {
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed(collapseStorageKey));
  const location = useLocation();
  const auth = getAuthUser();

  useEffect(() => {
    try {
      window.localStorage.setItem(collapseStorageKey, collapsed ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed, collapseStorageKey]);

  const displayName = displayNameProp ?? auth.name ?? 'User';
  const displayRole = displayRoleProp ?? auth.role ?? 'user';

  const initials = String(displayName || 'U')
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    clearAuthSession();
    /* Full navigation clears SPA history/bfcache so Back cannot reopen an authenticated shell. */
    window.location.replace(`${window.location.origin}/login`);
  };

  const navActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const navLink = (item, collapsedMode) => {
    const isActive = navActive(item);
    return (
      <Link
        key={item.path}
        to={item.path}
        title={collapsedMode ? item.label : ''}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsedMode ? '11px 0' : '9px 10px',
          borderRadius: 8,
          color: isActive ? '#f0f4ff' : '#64748b',
          background: isActive ? 'rgba(13,148,136,0.12)' : 'transparent',
          borderLeft: `3px solid ${isActive ? '#0d9488' : 'transparent'}`,
          textDecoration: 'none',
          transition: 'all 0.15s',
          justifyContent: collapsedMode ? 'center' : 'flex-start',
          fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? '#0d9488' : 'inherit',
          }}
        >
          {item.icon}
        </span>
        {!collapsedMode && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        )}
        {!collapsedMode && item.badge > 0 ? (
          <span
            style={{
              marginLeft: 'auto',
              background: '#dc2626',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 10,
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const aside = (
    // Wrapper: hidden on small screens (Issue 2). No inline display:flex — that broke `hidden`.
    <div
      className="sidebar-shell sticky top-0 z-30 hidden h-screen shrink-0 lg:flex lg:flex-col"
      style={{
        width: collapsed ? 72 : 240,
        minHeight: '100vh',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
      }}
    >
      <aside
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          background: '#0d1525',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 12,
            padding: collapsed ? '14px 10px' : '14px 14px 14px 16px',
            minHeight: collapsed ? 60 : 68,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <img
            src={logoSrc}
            alt="CareConnect 360"
            title="CareConnect 360"
            style={{
              width: collapsed ? 34 : 50,
              height: collapsed ? 34 : 50,
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f0f4ff',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.3px',
                  display: 'block',
                }}
              >
                CareConnect<span style={{ color: '#0d9488' }}> 360</span>
              </span>
              {portalSubtitle ? (
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  {portalSubtitle}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Floating collapse toggle on sidebar edge (Issue 1), above main content */}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
          className="pointer-events-auto absolute left-full top-[20px] z-[100] flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-white/25 text-white shadow-md shadow-black/30 outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1525]"
          style={{ backgroundColor: roleColor }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {collapsed ? <path d="M4 2l4 4-4 4" /> : <path d="M8 2L4 6l4 4" />}
          </svg>
        </button>

        {!collapsed && (
          <div
            style={{
              padding: '12px 16px 4px',
              fontSize: 10,
              fontWeight: 600,
              color: '#64748b',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {portalLabel}
          </div>
        )}

        <nav
          className="app-scrollbar-minimal"
          style={{
            flex: 1,
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {navItems.map((item) => navLink(item, collapsed))}
        </nav>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />

        <div
          style={{
            padding: '12px 12px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            margin: '8px 10px 0',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: roleColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              letterSpacing: '0.5px',
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#e2e8f0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: roleColor,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  marginTop: 1,
                }}
              >
                {String(displayRole).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: collapsed ? '12px 0' : '10px 16px',
            margin: '8px 10px 12px',
            borderRadius: 10,
            background: 'rgba(244, 114, 182, 0.06)',
            border: '1px solid rgba(244, 114, 182, 0.12)',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            width: 'auto',
            alignSelf: 'stretch',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fda4af';
            e.currentTarget.style.background = 'rgba(244, 114, 182, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#e2e8f0';
            e.currentTarget.style.background = 'rgba(244, 114, 182, 0.06)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </aside>
    </div>
  );

  const mobileNav = showMobileNav ? (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden"
      style={{ background: 'rgba(7, 13, 26, 0.92)' }}
    >
      <div
        className="mx-auto max-w-3xl px-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${mobileNavCols}, minmax(0, 1fr))`,
          gap: 4,
          padding: '6px 4px',
        }}
      >
        {navItems.map((item) => {
          const active = navActive(item);
          return (
            <Link
              key={`m-${item.path}`}
              to={item.path}
              className={`flex min-h-[3rem] flex-col items-center justify-center rounded-xl px-1 text-center text-[0.65rem] transition ${
                active ? 'bg-teal-500/20 text-teal-100' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center [&_svg]:h-[15px] [&_svg]:w-[15px]">{item.icon}</span>
              <span className="mt-1 leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  ) : null;

  return (
    <>
      {aside}
      {mobileNav}
    </>
  );
}

export default AppSidebar;

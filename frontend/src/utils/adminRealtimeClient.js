import { io } from 'socket.io-client';

const listeners = new Set();
let socket = null;

function getSocketUrl() {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  return String(raw).replace(/\/api\/?$/i, '');
}

function adminRoleAndToken() {
  const token = localStorage.getItem('careconnect360_token');
  let role = '';
  try {
    role = JSON.parse(localStorage.getItem('user') || '{}').role || '';
  } catch {
    role = '';
  }
  return { token, role };
}

/**
 * Subscribe to admin push events (single shared socket). Handler receives `{ scopes?, ts, reason? }`.
 * Call returned unsubscribe on unmount.
 */
export function subscribeAdminRealtime(handler) {
  const { token, role } = adminRoleAndToken();
  if (!token || role !== 'admin') return () => {};

  listeners.add(handler);

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('admin:refresh', (payload) => {
      listeners.forEach((fn) => {
        try {
          fn(payload);
        } catch {
          /* ignore subscriber errors */
        }
      });
    });

    socket.on('connect_error', () => {});
  }

  return () => {
    listeners.delete(handler);
    if (listeners.size === 0 && socket) {
      socket.disconnect();
      socket = null;
    }
  };
}

/** Returns true if every scope in payload applies, or payload has no scopes (broadcast-all). */
export function adminRefreshMatchesScopes(payload, scopesNeeded) {
  const scopes = payload?.scopes;
  if (!Array.isArray(scopes) || scopes.length === 0) return true;
  return scopesNeeded.some((s) => scopes.includes(s));
}

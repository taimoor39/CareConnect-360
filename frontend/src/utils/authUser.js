const decodeJwtPayload = (token) => {
  try {
    const payloadPart = String(token || '').split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

/** True if token is missing, malformed, or past exp (with small skew). */
export function isAuthTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    if (!payload.exp || typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now() + 10_000;
  } catch {
    return true;
  }
}

/** Returns stored bearer token or null; clears storage if expired/malformed. */
export function getValidStoredTokenOrClear() {
  const token = localStorage.getItem('careconnect360_token') || localStorage.getItem('token');
  if (!token) return null;
  if (isAuthTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

export function getAuthUser() {
  const token = localStorage.getItem('careconnect360_token') || localStorage.getItem('token') || '';
  let localUser = {};
  try {
    localUser = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    localUser = {};
  }

  const payload = decodeJwtPayload(token) || {};
  const id = localUser._id || localUser.id || payload._id || payload.id || '';
  const name = localUser.name || payload.name || 'User';
  const role = localUser.role || payload.role || '';

  return { token, id: String(id || ''), name: String(name || 'User'), role: String(role || '') };
}

export function clearAuthSession() {
  localStorage.removeItem('careconnect360_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}


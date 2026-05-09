import { Navigate, useLocation } from 'react-router-dom';

import { getValidStoredTokenOrClear } from '../../utils/authUser.js';

const decodePayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const roleRedirectMap = {
  admin: '/dashboard',
  doctor: '/doctor/dashboard',
  receptionist: '/receptionist/dashboard',
  patient: '/patient/dashboard',
};

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const token = getValidStoredTokenOrClear();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let roleFromUser = '';
  let requirePasswordChange = false;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    roleFromUser = u?.role || '';
    requirePasswordChange = !!u?.requirePasswordChange;
  } catch {
    roleFromUser = '';
  }

  if (requirePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const payload = decodePayload(token);
  const role = roleFromUser || payload?.role || '';

  if (!role) {
    localStorage.removeItem('careconnect360_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return <Navigate to={roleRedirectMap[role] || '/dashboard'} replace />;
  }

  return children;
}

export default RoleProtectedRoute;

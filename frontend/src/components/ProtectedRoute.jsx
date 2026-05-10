import RoleProtectedRoute from './auth/RoleProtectedRoute.jsx';

/** Convenience wrapper: admin-only pages (same as RoleProtectedRoute with allowedRoles=['admin']). */
function ProtectedRoute({ children }) {
  return (
    <RoleProtectedRoute allowedRoles={['admin']}>
      {children}
    </RoleProtectedRoute>
  );
}

export default ProtectedRoute;
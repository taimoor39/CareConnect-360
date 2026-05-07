import RoleProtectedRoute from './auth/RoleProtectedRoute.jsx';

function ProtectedRoute({ children }) {
  return (
    <RoleProtectedRoute allowedRoles={['admin']}>
      {children}
    </RoleProtectedRoute>
  );
}

export default ProtectedRoute;
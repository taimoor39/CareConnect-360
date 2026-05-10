/**
 * Root router for CareConnect 360 SPA (React Router v7).
 *
 * Pattern:
 *   - Public auth routes: /login, /register, /verify-email/:token, forgot/reset password.
 *   - ProtectedRoute → admin-only shell (legacy shortcut to RoleProtectedRoute admin).
 *   - RoleProtectedRoute → each portal (doctor / receptionist / patient) under its path prefix.
 *
 * Patient portal nests routes under PatientLayout for shared chrome + outlet context.
 */
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute.jsx';
import AppointmentManagement from './pages/AppointmentManagement.jsx';
import AnalyticsDashboard from './pages/AnalyticsDashboard.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import BillingManagement from './pages/BillingManagement.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChangeRequiredPassword from './pages/ChangeRequiredPassword.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPatient from './pages/RegisterPatient.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import DoctorManagement from './pages/DoctorManagement.jsx';
import PatientManagement from './pages/PatientManagement.jsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';
import DoctorSchedule from './pages/doctor/DoctorSchedule.jsx';
import DoctorPatients from './pages/doctor/DoctorPatients.jsx';
import DoctorConsultations from './pages/doctor/DoctorConsultations.jsx';
import DoctorReports from './pages/doctor/DoctorReports.jsx';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions.jsx';
import DoctorProfile from './pages/doctor/DoctorProfile.jsx';
import Settings from './pages/Settings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard.jsx';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients.jsx';
import ReceptionistAppointments from './pages/receptionist/ReceptionistAppointments.jsx';
import ReceptionistCheckin from './pages/receptionist/ReceptionistCheckin.jsx';
import ReceptionistBilling from './pages/receptionist/ReceptionistBilling.jsx';
import PatientLayout from '@features/patient-portal/components/PatientLayout.jsx';
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import PatientAppointments from './pages/patient/PatientAppointments.jsx';
import PatientPrescriptions from './pages/patient/PatientPrescriptions.jsx';
import PatientReports from './pages/patient/PatientReports.jsx';
import PatientInvoices from './pages/patient/PatientInvoices.jsx';
import PatientProfile from './pages/patient/PatientProfile.jsx';

function ScrollToTopOnRouteChange() {
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <Routes>
        {/* ─── Public (no JWT) ─── */}
        <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPatient />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route
        path="/change-password"
        element={(
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'patient']}>
            <ChangeRequiredPassword />
          </RoleProtectedRoute>
        )}
      />

      {/* ─── Admin workspace ─── */}
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />

      {/* ─── Doctor portal ─── */}
      <Route
        path="/doctor/dashboard"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboard />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/schedule"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorSchedule />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/patients"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorPatients />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/consultations"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorConsultations />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/reports"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorReports />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/prescriptions"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorPrescriptions />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/doctor/profile"
        element={(
          <RoleProtectedRoute allowedRoles={['doctor']}>
            <DoctorProfile />
          </RoleProtectedRoute>
        )}
      />

      {/* ─── Reception (+ admin helpers for same routes) ─── */}
      <Route
        path="/receptionist/dashboard"
        element={(
          <RoleProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionistDashboard />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/receptionist/patients"
        element={(
          <RoleProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionistPatients />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/receptionist/appointments"
        element={(
          <RoleProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionistAppointments />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/receptionist/checkin"
        element={(
          <RoleProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionistCheckin />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/receptionist/billing"
        element={(
          <RoleProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionistBilling />
          </RoleProtectedRoute>
        )}
      />

      {/* ─── Patient portal (nested under PatientLayout) ─── */}
      <Route
        path="/patient"
        element={(
          <RoleProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </RoleProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="reports" element={<PatientReports />} />
        <Route path="invoices" element={<PatientInvoices />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* ─── Admin-only management modules (some shared with reception where noted) ─── */}
      <Route
        path="/patients"
        element={(
          <RoleProtectedRoute allowedRoles={['admin', 'receptionist']}>
            <PatientManagement />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path="/users"
        element={(
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/analytics"
        element={(
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/audit"
        element={(
          <ProtectedRoute>
            <AuditLogs />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/billing"
        element={(
          <ProtectedRoute>
            <BillingManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/appointments"
        element={(
          <ProtectedRoute>
            <AppointmentManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/settings"
        element={(
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/doctors"
        element={(
          <ProtectedRoute>
            <DoctorManagement />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: '#111e30',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 10,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
        }}
      />
    </>
  );
}

export default App;

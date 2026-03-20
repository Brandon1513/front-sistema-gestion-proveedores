import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { RoleProtectedRoute } from './components/auth/RoleProtectedRoute';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProviderLayout } from './layouts/ProviderLayout';
import { ProvidersPage } from './pages/providers/ProvidersPage';
import { ProviderDetailPage } from './pages/providers/ProviderDetailPage';
import { ProviderFormPage } from './pages/providers/ProviderFormPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { DocumentStatusPage } from './pages/documents/DocumentStatusPage';
import { DocumentValidationPage } from './pages/documents/DocumentValidationPage';
import { QualityDashboardPage } from './pages/quality/QualityDashboardPage';
import { ProviderRegisterPage } from './pages/providers/ProviderRegisterPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { InvitationsPage } from './pages/invitations/InvitationsPage';
import { ProviderDashboardPage } from './pages/providers/ProviderDashboardPage';
import { ProviderDocumentsPage } from './pages/providers/ProviderDocumentsPage';
import { ProviderUploadPage } from './pages/providers/ProviderUploadPage';
import { ProviderProfilePage } from './pages/providers/ProviderProfilePage';
import { ProviderCertificationsPage } from './pages/providers/ProviderCertificationsPage';
import { MyProfilePage } from './pages/profile/MyProfilePage';
import './styles/custom-animations.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    if ((user?.roles || []).includes('proveedor')) return <Navigate to="/provider/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/register/:token" element={<ProviderRegisterPage />} />

          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="quality/dashboard" element={<RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}><QualityDashboardPage /></RoleProtectedRoute>} />
            <Route path="admin/users" element={<RoleProtectedRoute allowedRoles={['super_admin','admin']}><UserManagementPage /></RoleProtectedRoute>} />
            <Route path="invitations" element={<RoleProtectedRoute allowedRoles={['super_admin','admin','compras']}><InvitationsPage /></RoleProtectedRoute>} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="providers/:id" element={<ProviderDetailPage />} />
            <Route path="providers/new" element={<ProviderFormPage />} />
            <Route path="providers/:id/edit" element={<ProviderFormPage />} />
            <Route path="documents" element={<RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}><DocumentsPage /></RoleProtectedRoute>} />
            <Route path="documents/status" element={<RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras']}><DocumentStatusPage /></RoleProtectedRoute>} />
            <Route path="documents/validation" element={<RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}><DocumentValidationPage /></RoleProtectedRoute>} />
            {/* ✅ Perfil de usuario interno — accesible para todos los roles internos */}
            <Route path="profile" element={<MyProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['proveedor']}><ProviderLayout /></RoleProtectedRoute></ProtectedRoute>}>
            <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
            <Route path="/provider/documents" element={<ProviderDocumentsPage />} />
            <Route path="/provider/upload" element={<ProviderUploadPage />} />
            <Route path="/provider/certifications" element={<ProviderCertificationsPage />} />
            <Route path="/provider/profile" element={<ProviderProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
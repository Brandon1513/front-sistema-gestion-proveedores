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
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { ProviderAppointmentsPage } from './pages/appointments/ProviderAppointmentsPage';
import { SecurityCalendarPage } from './pages/appointments/SecurityCalendarPage';
import { FoodEngineerPage } from './pages/appointments/FoodEngineerPage';
import { SmartRedirect } from './components/auth/SmartRedirect';
import { CatalogPage } from './pages/settings/CatalogPage';
import { DocumentManagementPage } from './pages/settings/DocumentManagementPage'; 
import { ProviderHelpPage } from './pages/providers/ProviderHelpPage';
import { ProviderTypeManagementPage } from './pages/settings/ProviderTypeManagementPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ProviderRegisterSuccessPage } from './pages/providers/ProviderRegisterSuccessPage';

import './styles/custom-animations.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    const roleNames = (user?.roles || []).map(r => r?.name || r);
    if (roleNames.includes('proveedor'))           return <Navigate to="/provider/dashboard" replace />;
    if (roleNames.includes('seguridad'))           return <Navigate to="/security/calendar" replace />;
    if (roleNames.includes('ingeniero_alimentos')) return <Navigate to="/food-engineer" replace />;
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
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          {/* ✅ Ruta estática de éxito — debe ir ANTES de /register/:token para no ser
              capturada como si "success" fuera un token de invitación */}
          <Route path="/register/success" element={<ProviderRegisterSuccessPage />} />
          <Route path="/register/:token" element={<ProviderRegisterPage />} />

          {/* ── DashboardLayout ── */}
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<SmartRedirect />} />

            <Route path="dashboard" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras']}>
                <DashboardPage />
              </RoleProtectedRoute>
            } />
            <Route path="quality/dashboard" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}>
                <QualityDashboardPage />
              </RoleProtectedRoute>
            } />
            <Route path="admin/users" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin']}>
                <UserManagementPage />
              </RoleProtectedRoute>
            } />
            <Route path="invitations" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','compras']}>
                <InvitationsPage />
              </RoleProtectedRoute>
            } />
            <Route path="appointments" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','compras']}>
                <AppointmentsPage />
              </RoleProtectedRoute>
            } />
            <Route path="security/calendar" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','seguridad']}>
                <SecurityCalendarPage />
              </RoleProtectedRoute>
            } />
            <Route path="food-engineer" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','ingeniero_alimentos']}>
                <FoodEngineerPage />
              </RoleProtectedRoute>
            } />
            <Route path="reports" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras','ingeniero_alimentos']}>
                <ReportsPage />
              </RoleProtectedRoute>
            } />

            <Route path="providers" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras','ingeniero_alimentos']}>
                <ProvidersPage />
              </RoleProtectedRoute>
            } />
            <Route path="providers/:id" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras','ingeniero_alimentos']}>
                <ProviderDetailPage />
              </RoleProtectedRoute>
            } />
            <Route path="providers/new"      element={<ProviderFormPage />} />
            <Route path="providers/:id/edit" element={<ProviderFormPage />} />

            <Route path="documents" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}>
                <DocumentsPage />
              </RoleProtectedRoute>
            } />
            <Route path="documents/status" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad','compras']}>
                <DocumentStatusPage />
              </RoleProtectedRoute>
            } />
            <Route path="documents/validation" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}>
                <DocumentValidationPage />
              </RoleProtectedRoute>
            } />

            {/* ── Configuración ── */}
            <Route path="settings/catalog" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','compras']}>
                <CatalogPage />
              </RoleProtectedRoute>
            } />
            {/*  NUEVO — Gestión de tipos de documentos */}
            <Route path="settings/documents" element={
              <RoleProtectedRoute allowedRoles={['super_admin','admin','calidad']}>
                <DocumentManagementPage />
              </RoleProtectedRoute>
            } />
            <Route path="/settings/provider-types" element={<ProviderTypeManagementPage />} />

            <Route path="profile" element={<MyProfilePage />} />
          </Route>

          {/* ── Portal Proveedor ── */}
          <Route element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['proveedor']}>
                <ProviderLayout />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }>
            <Route path="/provider/dashboard"      element={<ProviderDashboardPage />} />
            <Route path="/provider/documents"      element={<ProviderDocumentsPage />} />
            <Route path="/provider/upload"         element={<ProviderUploadPage />} />
            <Route path="/provider/certifications" element={<ProviderCertificationsPage />} />
            <Route path="/provider/profile"        element={<ProviderProfilePage />} />
            <Route path="/provider/appointments"   element={<ProviderAppointmentsPage />} />
            <Route path="/provider/help"           element={<ProviderHelpPage/>}/>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
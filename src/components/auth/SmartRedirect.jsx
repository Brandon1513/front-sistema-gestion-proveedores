// ================================================================
// ARCHIVO NUEVO: src/components/auth/SmartRedirect.jsx
// ================================================================
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Redirige al home correcto según el rol del usuario.
 * Usado en la ruta index del DashboardLayout.
 */
export const SmartRedirect = () => {
  const { user } = useAuthStore();

  const getRoleName = () => {
    if (user?.role) return user.role;
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0]?.name || user.roles[0];
    }
    return null;
  };

  const role = getRoleName()?.toLowerCase();

  if (role === 'proveedor')           return <Navigate to="/provider/dashboard" replace />;
  if (role === 'seguridad')           return <Navigate to="/security/calendar" replace />;
  if (role === 'ingeniero_alimentos') return <Navigate to="/food-engineer" replace />;
  return <Navigate to="/dashboard" replace />;
};
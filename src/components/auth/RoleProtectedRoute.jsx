import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

// Orden de prioridad para decidir el "home" cuando un usuario tiene
// varios roles — los roles con una vista muy específica y aislada van
// primero; el resto cae al Dashboard general.
const HOME_PRIORITY = [
  { role: 'proveedor',       path: '/provider/dashboard' },
  { role: 'seguridad',       path: '/security/calendar' },
  { role: 'emp_solicitante', path: '/my-requests' },
];

const getHomeByRoles = (roleNames = []) => {
  const lower = roleNames.map((r) => r?.toLowerCase());
  for (const { role, path } of HOME_PRIORITY) {
    if (lower.includes(role)) return path;
  }
  return '/dashboard';
};

export const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore();

  // No autenticado → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Sin restricción de roles → permitir
  if (allowedRoles.length === 0) return children;

  // Todos los roles del usuario (puede tener varios)
  const getUserRoles = () => {
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles.map((r) => r?.name || r);
    }
    if (user?.role) return [user.role];
    return [];
  };

  const userRoles        = getUserRoles();
  const normalizedUser   = userRoles.map((r) => r?.toLowerCase());
  const normalizedAllow  = allowedRoles.map((r) => r.toLowerCase());
  const hasAccess         = normalizedUser.some((r) => normalizedAllow.includes(r));

  // Sin acceso → redirigir a su home, nunca mostrar error
  if (!hasAccess) return <Navigate to={getHomeByRoles(userRoles)} replace />;

  return children;
};
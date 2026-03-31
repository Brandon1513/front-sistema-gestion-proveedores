import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

// Home de cada rol — agrega aquí si se crean más roles
const getHomeByRole = (role) => {
  const r = role?.toLowerCase();
  if (r === 'proveedor')           return '/provider/dashboard';
  if (r === 'seguridad')           return '/security/calendar';
  if (r === 'ingeniero_alimentos') return '/food-engineer';
  return '/dashboard';
};

export const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore();

  // No autenticado → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Sin restricción de roles → permitir
  if (allowedRoles.length === 0) return children;

  // Obtener el rol del usuario
  const getUserRole = () => {
    if (user?.role) return user.role;
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0]?.name || user.roles[0];
    }
    return null;
  };

  const userRole   = getUserRole();
  const normalized = userRole?.toLowerCase();
  const hasAccess  = allowedRoles.map(r => r.toLowerCase()).includes(normalized);

  // Sin acceso → redirigir a su home, nunca mostrar error
  if (!hasAccess) return <Navigate to={getHomeByRole(userRole)} replace />;

  return children;
};
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Componente para proteger rutas que requieren roles específicos
 */
export const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si no hay roles especificados, permitir acceso
  if (allowedRoles.length === 0) {
    return children;
  }

  // Obtener el rol del usuario (puede venir en diferentes formatos)
  const getUserRole = () => {
    // Si viene como string directo
    if (user?.role) {
      return user.role;
    }
    
    // Si viene en un array de roles (Spatie Laravel Permission)
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0]?.name || user.roles[0];
    }
    
    return null;
  };

  const userRole = getUserRole();

  // Si no pudimos obtener el rol, denegar acceso
  if (!userRole) {
    return <AccessDenied userRole="No definido" />;
  }

  // Verificar si el usuario tiene uno de los roles permitidos (case-insensitive)
  const normalizedUserRole = userRole.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  const hasAccess = normalizedAllowedRoles.includes(normalizedUserRole);

  console.log('🔐 RoleProtectedRoute:', {
    userRole: normalizedUserRole,
    allowedRoles: normalizedAllowedRoles,
    hasAccess
  });

  // Si no tiene acceso, mostrar página de acceso denegado
  if (!hasAccess) {
    return <AccessDenied userRole={userRole} allowedRoles={allowedRoles} />;
  }

  // Si tiene acceso, mostrar el contenido
  return children;
};

/**
 * Componente para mostrar cuando el usuario no tiene permisos
 */
const AccessDenied = ({ userRole, allowedRoles = [] }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Acceso Denegado
        </h1>
        <p className="mb-4 text-gray-600">
          No tienes permisos para acceder a esta página.
        </p>
        {userRole && (
          <div className="p-3 mb-4 text-sm border rounded-lg bg-gray-50">
            <p className="text-gray-600">
              Tu rol actual: <span className="font-medium text-gray-900">{userRole}</span>
            </p>
            {allowedRoles.length > 0 && (
              <p className="mt-1 text-gray-600">
                Roles permitidos: <span className="font-medium text-gray-900">{allowedRoles.join(', ')}</span>
              </p>
            )}
          </div>
        )}
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 mt-2 text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700"
        >
          Volver
        </button>
      </div>
    </div>
  );
};
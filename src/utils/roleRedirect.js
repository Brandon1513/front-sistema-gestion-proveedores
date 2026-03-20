// src/utils/roleRedirect.js

/**
 * Obtiene la ruta de dashboard según el rol del usuario
 * @param {Array} roles - Array de roles del usuario
 * @returns {string} - Ruta del dashboard
 */
export const getDashboardRoute = (roles) => {
  if (!roles || roles.length === 0) {
    return '/dashboard';
  }

  // Convertir a array si es necesario
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  // Proveedor
  if (roleArray.includes('proveedor')) {
    return '/provider/dashboard';
  }
  
  // Admin o Super Admin
  if (roleArray.includes('super_admin') || roleArray.includes('admin')) {
    return '/dashboard';
  }
  
  // Compras
  if (roleArray.includes('compras')) {
    return '/dashboard';
  }
  
  // Calidad
  if (roleArray.includes('calidad')) {
    return '/dashboard';
  }
  
  // Por defecto
  return '/dashboard';
};

/**
 * Verifica si el usuario tiene acceso a una ruta
 * @param {Array} userRoles - Roles del usuario
 * @param {Array} allowedRoles - Roles permitidos para la ruta
 * @returns {boolean}
 */
export const hasAccess = (userRoles, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  
  const roleArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  
  return roleArray.some(role => allowedRoles.includes(role));
};
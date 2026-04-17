import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../api/authService';
import { useQuery } from '@tanstack/react-query';
import { documentService } from '../api/documentService';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { CalendarDays } from 'lucide-react';
import {
  LayoutDashboard, Users, FileText, CheckSquare, LogOut,
  Menu, X, Bell, BarChart3, Send, Shield, FlaskConical,
  Settings, FileCog, Package, ChevronDown, ChevronRight,
} from 'lucide-react';

export const DashboardLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Configuración expandida si la ruta activa es una sub-ruta ──────────────
  const isSettingsActive = location.pathname.startsWith('/settings');
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  const handleLogout = async () => {
    try { await authService.logout(); } catch (e) { console.error(e); } finally {
      logout(); navigate('/login');
    }
  };

  const getUserRole = () => {
    if (user?.role) return user.role;
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0)
      return user.roles[0]?.name || user.roles[0];
    return null;
  };
  const userRole = getUserRole();

  const canValidate = ['super_admin', 'admin', 'calidad'].includes(userRole?.toLowerCase());
  const { data: pendingData } = useQuery({
    queryKey: ['pending-badge'],
    queryFn: () => documentService.getPending({}),
    refetchInterval: 30 * 1000,
    enabled: canValidate,
    select: (data) => data?.stats?.total_pending || 0,
  });
  const pendingCount = pendingData || 0;

  // ── Navegación principal ───────────────────────────────────────────────────
  const navigation = [
    { name: 'Dashboard',             href: '/dashboard',            icon: LayoutDashboard, roles: ['super_admin','admin','calidad','compras'] },
    { name: 'Proveedores',           href: '/providers',            icon: Users,           roles: ['super_admin','admin','calidad','compras','ingeniero_alimentos'] },
    { name: 'Documentos',            href: '/documents',            icon: FileText,        roles: ['super_admin','admin','calidad'] },
    { name: 'Estado Documental',     href: '/documents/status',     icon: FileText,        roles: ['compras'] },
    { name: 'Validar Documentos',    href: '/documents/validation', icon: CheckSquare,     roles: ['super_admin','admin','calidad'] },
    { name: 'Estadísticas de Calidad',href:'/quality/dashboard',   icon: BarChart3,       roles: ['super_admin','admin','calidad'] },
    { name: 'Invitaciones',          href: '/invitations',          icon: Send,            roles: ['super_admin','admin','compras'] },
    { name: 'Calendario de Citas',   href: '/appointments',         icon: CalendarDays,    roles: ['super_admin','admin','compras'] },
    { name: 'Control de Acceso',     href: '/security/calendar',    icon: Shield,          roles: ['super_admin','admin','seguridad'] },
    { name: 'Recepción de Productos',href: '/food-engineer',        icon: FlaskConical,    roles: ['super_admin','admin','ingeniero_alimentos'] },
    { name: 'User Management',       href: '/admin/users',          icon: Users,           roles: ['super_admin','admin'] },
  ];

  // ── Sub-ítems de Configuración ─────────────────────────────────────────────
  // Cada sub-ítem tiene sus propios roles — el padre aparece si el usuario
  // tiene acceso a AL MENOS uno de los sub-ítems
  const settingsChildren = [
    { name: 'Catálogo de Productos', href: '/settings/catalog',    icon: Package,  roles: ['super_admin','admin','compras'] },
    { name: 'Tipos de Documentos',   href: '/settings/documents',  icon: FileCog,  roles: ['super_admin','admin','calidad'] },
  ];

  const hasAccess = (itemRoles) => {
    if (!itemRoles || itemRoles.length === 0) return true;
    if (!userRole) return false;
    return itemRoles.map(r => r.toLowerCase()).includes(userRole.toLowerCase());
  };

  const visibleNavigation    = navigation.filter(item => hasAccess(item.roles));
  const visibleSettingsItems = settingsChildren.filter(item => hasAccess(item.roles));
  const showSettings         = visibleSettingsItems.length > 0;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleColors = {
    'super_admin': 'bg-gradient-to-br from-purple-600 to-purple-700',
    'admin':       'bg-gradient-to-br from-purple-500 to-purple-600',
    'calidad':     'bg-gradient-to-br from-amber-500 to-amber-600',
    'compras':     'bg-gradient-to-br from-rose-500 to-rose-600',
    'proveedor':   'bg-gradient-to-br from-gray-500 to-gray-600',
  };
  const getRoleColor = () => roleColors[userRole?.toLowerCase()] || 'bg-gradient-to-br from-gray-500 to-gray-600';

  // ── Sidebar compartido ─────────────────────────────────────────────────────
  const SidebarContent = ({ onLinkClick }) => (
    <>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Ítems normales — los que van ANTES de Configuración */}
        {visibleNavigation.map((item) => (
          <NavLink key={item.name} to={item.href} onClick={onLinkClick}
            className={({ isActive }) =>
              `group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-primary text-white shadow-primary'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 hover:text-primary'
              }`
            }>
            <span className="flex items-center gap-3">
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110"/>
              {item.name}
            </span>
            {item.href === '/documents/validation' && pendingCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* ── Configuración colapsable ── */}
        {showSettings && (
          <div>
            {/* Botón padre */}
            <button
              type="button"
              onClick={() => setSettingsOpen(o => !o)}
              className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isSettingsActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 hover:text-primary'
              }`}>
              <span className="flex items-center gap-3">
                <Settings className="w-5 h-5 transition-transform group-hover:scale-110"/>
                Configuración
              </span>
              {settingsOpen
                ? <ChevronDown className="w-4 h-4 text-gray-400 transition-transform"/>
                : <ChevronRight className="w-4 h-4 text-gray-400 transition-transform"/>}
            </button>

            {/* Sub-ítems */}
            {settingsOpen && (
              <div className="mt-1 ml-3 pl-4 border-l-2 border-primary-100 space-y-1">
                {visibleSettingsItems.map(item => (
                  <NavLink key={item.name} to={item.href} onClick={onLinkClick}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-primary text-white shadow-primary'
                          : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                      }`
                    }>
                    <item.icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110"/>
                    {item.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer del sidebar */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <div
          onClick={() => { navigate('/profile'); onLinkClick?.(); }}
          className="flex items-center p-3 mb-4 transition-all duration-200 bg-white shadow-sm cursor-pointer rounded-xl hover:bg-primary-50 hover:shadow-md group"
          title="Ver mi perfil">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRoleColor()} text-white font-bold text-lg shadow-md flex-shrink-0`}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm font-semibold text-gray-900 truncate transition-colors group-hover:text-primary-700">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
              {userRole || 'Sin rol'}
            </span>
          </div>
        </div>
        <PWAInstallButton/>
        <button onClick={handleLogout}
          className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition-all duration-200 shadow-md bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 hover:shadow-lg">
          <LogOut className="w-5 h-5 mr-2"/>Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* ── Sidebar móvil ── */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}/>
        <div className={`fixed inset-y-0 left-0 flex flex-col w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between h-20 px-6 shadow-lg bg-gradient-primary">
            <div className="flex items-center space-x-3">
              <img src="/images/logo.png" alt="SGP Logo" className="w-auto h-10"/>
              <div>
                <span className="text-xl font-bold tracking-tight text-white">SGP</span>
                <p className="text-xs text-primary-100">Gestión de Proveedores</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-white transition-colors rounded-lg hover:bg-white/10">
              <X className="w-6 h-6"/>
            </button>
          </div>
          <SidebarContent onLinkClick={() => setSidebarOpen(false)}/>
        </div>
      </div>

      {/* ── Sidebar desktop ── */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white shadow-xl">
          <div className="flex items-center h-20 px-6 shadow-lg bg-gradient-primary">
            <img src="/images/logo.png" alt="SGP Logo" className="w-auto h-12"/>
            <div className="ml-3">
              <span className="text-xl font-bold tracking-tight text-white">SGP</span>
              <p className="text-xs text-primary-100">Gestión de Proveedores</p>
            </div>
          </div>
          <SidebarContent/>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-10 flex h-16 border-b border-gray-200 shadow-sm bg-white/80 backdrop-blur-md lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="px-4 text-gray-700 transition-colors hover:text-primary focus:outline-none">
            <Menu className="w-6 h-6"/>
          </button>
          <div className="flex items-center flex-1 px-4">
            <img src="/images/logo.png" alt="SGP" className="w-auto h-8 mr-2"/>
            <span className="text-lg font-bold text-primary">SGP</span>
          </div>
          <div className="flex items-center pr-4 space-x-2">
            <button className="p-2 text-gray-600 transition-colors rounded-lg hover:text-primary hover:bg-primary-50">
              <Bell className="w-5 h-5"/>
            </button>
          </div>
        </div>
        <main className="p-4 lg:p-8">
          <Outlet/>
        </main>
      </div>
    </div>
  );
};
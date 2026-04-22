import React, { useState, useRef, useEffect } from 'react';
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
  PanelLeftClose, PanelLeftOpen, Clock, AlertTriangle,
} from 'lucide-react';

export const DashboardLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const isSettingsActive = location.pathname.startsWith('/settings');
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // ── Conteo de pendientes (badge) ──────────────────────────────────────────
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-badge'],
    queryFn: () => documentService.getPending({}),
    refetchInterval: 30 * 1000,
    enabled: canValidate,
    select: (data) => data?.stats?.total_pending || 0,
  });

  // ── Documentos pendientes detallados para el panel ────────────────────────
  const { data: pendingDocsRaw } = useQuery({
    queryKey: ['notif-pending-docs'],
    queryFn: () => documentService.getPending({ per_page: 5 }),
    refetchInterval: 60 * 1000,
    enabled: canValidate && showNotifications,
  });

  // Intentar extraer el array de documentos de diferentes estructuras posibles
  const pendingDocs = pendingDocsRaw?.documents?.data
    || pendingDocsRaw?.documents
    || pendingDocsRaw?.data
    || [];

  const navigation = [
    { name: 'Dashboard',              href: '/dashboard',            icon: LayoutDashboard, roles: ['super_admin','admin','calidad','compras'] },
    { name: 'Proveedores',            href: '/providers',            icon: Users,           roles: ['super_admin','admin','calidad','compras','ingeniero_alimentos'] },
    { name: 'Documentos',             href: '/documents',            icon: FileText,        roles: ['super_admin','admin','calidad'] },
    { name: 'Estado Documental',      href: '/documents/status',     icon: FileText,        roles: ['compras'] },
    { name: 'Validar Documentos',     href: '/documents/validation', icon: CheckSquare,     roles: ['super_admin','admin','calidad'] },
    { name: 'Estadísticas de Calidad',href: '/quality/dashboard',    icon: BarChart3,       roles: ['super_admin','admin','calidad'] },
    { name: 'Invitaciones',           href: '/invitations',          icon: Send,            roles: ['super_admin','admin','compras'] },
    { name: 'Calendario de Citas',    href: '/appointments',         icon: CalendarDays,    roles: ['super_admin','admin','compras'] },
    { name: 'Control de Acceso',      href: '/security/calendar',    icon: Shield,          roles: ['super_admin','admin','seguridad'] },
    { name: 'Recepción de Productos', href: '/food-engineer',        icon: FlaskConical,    roles: ['super_admin','admin','ingeniero_alimentos'] },
    { name: 'User Management',        href: '/admin/users',          icon: Users,           roles: ['super_admin','admin'] },
  ];

  const settingsChildren = [
    { name: 'Catálogo de Productos', href: '/settings/catalog',   icon: Package,  roles: ['super_admin','admin','compras'] },
    { name: 'Tipos de Documentos',   href: '/settings/documents', icon: FileCog,  roles: ['super_admin','admin','calidad'] },
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

  // ── Panel de notificaciones ───────────────────────────────────────────────
  const NotificationsPanel = () => (
    <div className="absolute right-0 z-50 overflow-hidden bg-white border border-gray-100 shadow-2xl top-12 w-80 rounded-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <p className="text-sm font-bold text-gray-900">Notificaciones</p>
        {pendingCount > 0 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="overflow-y-auto max-h-80">
        {pendingCount === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Sin documentos pendientes</p>
          </div>
        ) : pendingDocs.length > 0 ? (
          <>
            {pendingDocs.map(doc => (
              <div key={doc.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors border-b cursor-pointer border-gray-50 hover:bg-gray-50"
                onClick={() => { navigate('/documents/validation'); setShowNotifications(false); }}>
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 mt-0.5">
                  <FileText className="w-4 h-4 text-amber-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {doc.document_type?.name || doc.document_type_name || 'Documento'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {doc.provider?.business_name || doc.provider?.name || doc.provider_name || 'Proveedor'}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3"/>Pendiente de validación
                  </p>
                </div>
              </div>
            ))}
            {pendingCount > 5 && (
              <button onClick={() => { navigate('/documents/validation'); setShowNotifications(false); }}
                className="w-full px-4 py-3 text-xs font-semibold text-center transition-colors border-t border-gray-100 text-primary-600 hover:bg-primary-50">
                Ver todos los {pendingCount} documentos pendientes →
              </button>
            )}
          </>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">
              Hay {pendingCount} documento{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}.
            </p>
            <button onClick={() => { navigate('/documents/validation'); setShowNotifications(false); }}
              className="mt-3 text-xs font-semibold text-primary-600 hover:underline">
              Ir a validar documentos →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Botón de campana (reutilizable) ───────────────────────────────────────
  const BellButton = () => (
    <div className="relative" ref={notifRef}>
      <button onClick={() => setShowNotifications(v => !v)}
        className="relative p-2 text-gray-500 transition-colors rounded-xl hover:text-primary hover:bg-primary-50"
        title="Notificaciones">
        <Bell className="w-5 h-5"/>
        {pendingCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>
      {showNotifications && <NotificationsPanel/>}
    </div>
  );

  // ── Sidebar content ───────────────────────────────────────────────────────
  const SidebarContent = ({ onLinkClick, collapsed = false }) => (
    <>
      <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
        {visibleNavigation.map((item) => (
          <NavLink key={item.name} to={item.href} onClick={onLinkClick}
            title={collapsed ? item.name : ''}
            className={({ isActive }) =>
              `group flex items-center rounded-xl transition-all duration-200 ${
                collapsed
                  ? 'justify-center w-10 h-10 mx-auto'
                  : 'justify-between px-4 py-3 text-sm font-medium'
              } ${isActive
                ? 'bg-gradient-primary text-white shadow-primary'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary'
              }`
            }>
            <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
              <item.icon className="flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110"/>
              {!collapsed && item.name}
            </span>
            {!collapsed && item.href === '/documents/validation' && pendingCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Configuración colapsable */}
        {showSettings && !collapsed && (
          <div>
            <button type="button" onClick={() => setSettingsOpen(o => !o)}
              className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isSettingsActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary'
              }`}>
              <span className="flex items-center gap-3">
                <Settings className="w-5 h-5 transition-transform group-hover:scale-110"/>
                Configuración
              </span>
              {settingsOpen
                ? <ChevronDown className="w-4 h-4 text-gray-400"/>
                : <ChevronRight className="w-4 h-4 text-gray-400"/>}
            </button>
            {settingsOpen && (
              <div className="pl-4 mt-1 ml-3 space-y-1 border-l-2 border-primary-100">
                {visibleSettingsItems.map(item => (
                  <NavLink key={item.name} to={item.href} onClick={onLinkClick}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-primary text-white shadow-primary'
                          : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                      }`
                    }>
                    <item.icon className="flex-shrink-0 w-4 h-4"/>
                    {item.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings ícono cuando está colapsado */}
        {showSettings && collapsed && (
          <NavLink to={visibleSettingsItems[0]?.href || '/settings'}
            title="Configuración"
            className={({ isActive }) =>
              `group flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 ${
                isSettingsActive
                  ? 'bg-gradient-primary text-white'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary'
              }`
            }>
            <Settings className="w-5 h-5"/>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      {!collapsed ? (
        <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <div onClick={() => { navigate('/profile'); onLinkClick?.(); }}
            className="flex items-center p-3 mb-4 transition-all duration-200 bg-white shadow-sm cursor-pointer rounded-xl hover:bg-primary-50 hover:shadow-md group">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRoleColor()} text-white font-bold text-lg shadow-md flex-shrink-0`}>
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0 ml-3">
              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700">{user?.name}</p>
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
      ) : (
        <div className="flex flex-col items-center gap-2 p-2 border-t border-gray-200">
          <div onClick={() => { navigate('/profile'); onLinkClick?.(); }}
            className={`flex items-center justify-center w-10 h-10 rounded-full ${getRoleColor()} text-white font-bold text-sm shadow-md cursor-pointer`}
            title={user?.name}>
            {getInitials(user?.name)}
          </div>
          <button onClick={handleLogout} title="Cerrar sesión"
            className="flex items-center justify-center w-10 h-10 text-white transition-all shadow-md rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* ── Sidebar móvil ── */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
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
          <SidebarContent onLinkClick={() => setSidebarOpen(false)} collapsed={false}/>
        </div>
      </div>

      {/* ── Sidebar desktop ── */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-72'}`}>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white shadow-xl">
          {/* Header con botón colapsar */}
          <div className={`flex items-center h-20 shadow-lg bg-gradient-primary transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
            {!sidebarCollapsed && (
              <>
                <img src="/images/logo.png" alt="SGP Logo" className="flex-shrink-0 w-auto h-12"/>
                <div className="flex-1 min-w-0 ml-3">
                  <span className="text-xl font-bold tracking-tight text-white">SGP</span>
                  <p className="text-xs text-primary-100">Gestión de Proveedores</p>
                </div>
              </>
            )}
            <button onClick={() => setSidebarCollapsed(c => !c)}
              className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5"/> : <PanelLeftClose className="w-5 h-5"/>}
            </button>
          </div>
          <SidebarContent collapsed={sidebarCollapsed}/>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'}`}>
        {/* Header móvil */}
        <div className="sticky top-0 z-10 flex h-16 border-b border-gray-200 shadow-sm bg-white/80 backdrop-blur-md lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="px-4 text-gray-700 transition-colors hover:text-primary focus:outline-none">
            <Menu className="w-6 h-6"/>
          </button>
          <div className="flex items-center flex-1 px-4">
            <img src="/images/logo.png" alt="SGP" className="w-auto h-8 mr-2"/>
            <span className="text-lg font-bold text-primary">SGP</span>
          </div>
          <div className="flex items-center pr-4">
            <BellButton/>
          </div>
        </div>

        {/*  Header desktop con campana y usuario */}
        <div className="sticky top-0 z-10 items-center justify-end hidden gap-3 px-8 border-b border-gray-100 shadow-sm lg:flex h-14 bg-white/90 backdrop-blur-md">
          <BellButton/>
           {/* Usuario en navbar
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
            <div className={`w-6 h-6 rounded-full ${getRoleColor()} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {getInitials(user?.name)}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">{user?.name}</span>
          </div> */}
        </div>

        <main className="p-4 lg:p-8">
          <Outlet/>
        </main>
      </div>
    </div>
  );
};
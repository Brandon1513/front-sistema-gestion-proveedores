import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import {
  LayoutDashboard, FileText, Upload, User, Award,
  LogOut, Menu, X, Bell, Clock, AlertTriangle,
  PanelLeftClose, PanelLeftOpen, HelpCircle,
} from 'lucide-react';
import api from '../api/axios';

export const ProviderLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const { data: expiringData } = useQuery({
    queryKey: ['provider-expiring-docs'],
    queryFn: () => api.get('/provider/documents/expiring').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  const expiringDocs  = expiringData?.expiring_documents || [];
  const expiringCount = expiringDocs.length;

  const menuItems = [
    { title: 'Dashboard',         icon: LayoutDashboard, path: '/provider/dashboard'      },
    { title: 'Mis Documentos',    icon: FileText,        path: '/provider/documents'      },
    { title: 'Cargar Documentos', icon: Upload,          path: '/provider/upload'         },
    { title: 'Certificaciones',   icon: Award,           path: '/provider/certifications' },
    { title: 'Mis Citas',         icon: CalendarDays,    path: '/provider/appointments'   },
    { title: 'Mi Perfil',         icon: User,            path: '/provider/profile'        },
    { title: 'Ayuda',             icon: HelpCircle,      path: '/provider/help'           },
  ];

  const isActive = (path) => location.pathname === path;

  const NotificationsPanel = () => (
    <div className="absolute right-0 z-50 overflow-hidden bg-white border border-gray-100 shadow-2xl top-12 w-80 rounded-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <p className="text-sm font-bold text-gray-900">Notificaciones</p>
        {expiringCount > 0 && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {expiringCount} por vencer
          </span>
        )}
      </div>
      <div className="overflow-y-auto max-h-80">
        {expiringCount === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Sin documentos próximos a vencer</p>
          </div>
        ) : (
          <>
            {expiringDocs.map(doc => (
              <div key={doc.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors border-b cursor-pointer border-gray-50 hover:bg-amber-50"
                onClick={() => { navigate('/provider/documents'); setShowNotifications(false); }}>
                <div className={`flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg mt-0.5 ${
                  doc.days_left <= 7 ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {doc.days_left <= 7
                    ? <AlertTriangle className="w-4 h-4 text-red-600"/>
                    : <Clock className="w-4 h-4 text-amber-600"/>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {doc.document_type?.name || doc.document_type_name || 'Documento'}
                  </p>
                  {doc.product_name && (
                    <p className="text-xs text-gray-500 truncate">{doc.product_name}</p>
                  )}
                  <p className={`text-xs mt-0.5 font-medium ${doc.days_left <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                    {doc.days_left === 0 ? '🔴 Vence hoy'
                      : doc.days_left === 1 ? '⚠️ Vence mañana'
                      : `📅 Vence en ${doc.days_left} días`}
                  </p>
                </div>
              </div>
            ))}
            <button onClick={() => { navigate('/provider/documents'); setShowNotifications(false); }}
              className="w-full px-4 py-3 text-xs font-semibold text-center transition-colors border-t border-gray-100 text-primary-600 hover:bg-primary-50">
              Ver mis documentos →
            </button>
          </>
        )}
      </div>
    </div>
  );

  const BellButton = () => (
    <div className="relative" ref={notifRef}>
      <button onClick={() => setShowNotifications(v => !v)}
        className="relative p-2 text-gray-500 transition-colors rounded-xl hover:text-primary hover:bg-primary-50"
        title="Notificaciones">
        <Bell className="w-5 h-5"/>
        {expiringCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
            {expiringCount > 9 ? '9+' : expiringCount}
          </span>
        )}
      </button>
      {showNotifications && <NotificationsPanel/>}
    </div>
  );

  const NavItems = ({ onLinkClick }) => (
    <>
      {menuItems.map((item) => {
        const Icon   = item.icon;
        const active = isActive(item.path);
        // ✅ Ayuda con estilo diferente — separador visual
        const isHelp = item.path === '/provider/help';
        return (
          <React.Fragment key={item.path}>
            {isHelp && !sidebarCollapsed && (
              <div className="my-1 border-t border-gray-100"/>
            )}
            <Link to={item.path} onClick={onLinkClick}
              title={sidebarCollapsed ? item.title : ''}
              className={`flex items-center rounded-xl transition-all duration-200 ${
                sidebarCollapsed
                  ? 'justify-center w-10 h-10 mx-auto'
                  : 'gap-3 px-4 py-3 text-sm font-semibold'
              } ${active
                ? 'bg-gradient-primary text-white shadow-md'
                : isHelp
                  ? 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
              }`}>
              <Icon className={`w-5 h-5 flex-shrink-0 ${
                active ? 'text-white' : isHelp ? 'text-blue-400' : 'text-gray-500'
              }`}/>
              {!sidebarCollapsed && item.title}
            </Link>
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* ── Sidebar Desktop ── */}
      <aside className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'md:w-16' : 'md:w-72'}`}>
        <div className={`flex flex-col bg-white border-r-2 border-gray-200 shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
          <div className={`flex items-center h-20 border-b-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
            {!sidebarCollapsed && (
              <>
                <img src="/images/logo.png" alt="SGP Logo" className="flex-shrink-0 w-auto h-12"/>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-primary-600">SGP</h1>
                  <p className="text-xs text-gray-600">Portal Proveedor</p>
                </div>
              </>
            )}
            <button onClick={() => setSidebarCollapsed(c => !c)}
              className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors rounded-lg text-primary-400 hover:text-primary-700 hover:bg-primary-100"
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5"/> : <PanelLeftClose className="w-5 h-5"/>}
            </button>
          </div>
          <nav className={`flex-1 py-6 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'px-1' : 'px-3'}`}>
            <NavItems/>
          </nav>
          {!sidebarCollapsed ? (
            <div className="p-4 border-t-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
              <div className="flex items-center p-3 mb-3 bg-white shadow-sm rounded-xl">
                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
                  <User className="w-6 h-6 text-white"/>
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Proveedor'}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-lg">
                <LogOut className="w-4 h-4 mr-2"/>Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-2 border-t-2 border-gray-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shadow-md cursor-pointer bg-gradient-primary" title={user?.name}>
                <User className="w-5 h-5 text-white"/>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión"
                className="flex items-center justify-center w-10 h-10 text-white transition-all shadow-md rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                <LogOut className="w-4 h-4"/>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Sidebar móvil overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}/>
      )}

      {/* ── Sidebar móvil ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-6 border-b-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="SGP Logo" className="w-auto h-12"/>
              <div>
                <h1 className="text-2xl font-bold text-primary-600">SGP</h1>
                <p className="text-xs text-gray-600">Portal Proveedor</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-white">
              <X className="w-6 h-6"/>
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <NavItems onLinkClick={() => setSidebarOpen(false)}/>
          </nav>
          <div className="p-4 border-t-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center p-3 mb-3 bg-white shadow-sm rounded-xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
                <User className="w-6 h-6 text-white"/>
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Proveedor'}</p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
              <LogOut className="w-4 h-4 mr-2"/>Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b-2 border-gray-200 shadow-sm md:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-primary-50 hover:text-primary-600">
              <Menu className="w-6 h-6"/>
            </button>
            <div className="flex items-center gap-2">
              <img src="/images/logo.png" alt="SGP Logo" className="w-auto h-8"/>
              <h1 className="text-xl font-bold text-primary-600">SGP</h1>
            </div>
            <BellButton/>
          </div>
        </header>
        <header className="sticky top-0 z-10 items-center justify-end hidden gap-3 px-8 bg-white border-b border-gray-100 shadow-sm md:flex h-14">
          <BellButton/>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet/>
          </div>
        </main>
      </div>
    </div>
  );
};
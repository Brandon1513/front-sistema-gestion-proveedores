import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  FileText,
  Upload,
  User,
  Award,
  LogOut,
  Menu,
  X,
  Bell
} from 'lucide-react';

export const ProviderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/provider/dashboard',
    },
    {
      title: 'Mis Documentos',
      icon: FileText,
      path: '/provider/documents',
    },
    {
      title: 'Cargar Documentos',
      icon: Upload,
      path: '/provider/upload',
    },
    {
      title: 'Certificaciones',
      icon: Award,
      path: '/provider/certifications',
    },
    {
      title: 'Mi Perfil',
      icon: User,
      path: '/provider/profile',
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72 bg-white border-r-2 border-gray-200 shadow-lg">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-6 border-b-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="SGP Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary-600">SGP</h1>
                <p className="text-xs text-gray-600">Portal Proveedor</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-gradient-primary text-white shadow-md transform scale-[1.02]'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? 'text-white' : 'text-gray-500'}`} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center mb-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-primary shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.name || 'Proveedor'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="SGP Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary-600">SGP</h1>
                <p className="text-xs text-gray-600">Portal Proveedor</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-500 rounded-lg hover:bg-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-gradient-primary text-white shadow-md'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? 'text-white' : 'text-gray-500'}`} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Mobile User Info */}
          <div className="p-4 border-t-2 border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-center mb-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-primary shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.name || 'Proveedor'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm md:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2">
              <img 
                src="/images/logo.png" 
                alt="SGP Logo" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-primary-600">SGP</h1>
            </div>
            
            <button className="p-2 text-gray-500 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors relative">
              <Bell className="w-6 h-6" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
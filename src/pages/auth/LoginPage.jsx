import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../api/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertCircle, Mail } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(formData);
      setAuth(response.user, response.token);

      const userRoles = response.user.roles || [];
      if (userRoles.includes('proveedor')) {
        navigate('/provider/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const data = err.response?.data;
      const errorCode = data?.error_code;

      if (['PROVIDER_INACTIVE', 'PROVIDER_REJECTED', 'ACCOUNT_INACTIVE'].includes(errorCode)) {
        setError({ message: data.message, contact_email: data.contact_email, is_inactive: true });
      } else {
        setError({ message: data?.message || 'Error al iniciar sesión', is_inactive: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="p-8 bg-white rounded-2xl shadow-elevated animate-fade-in">
          {/* Logo y título */}
          <div className="mb-8 text-center">
            <img src="/images/logo.png" alt="Logo SGP" className="w-auto h-24 mx-auto mb-4" />
            <h1 className="mb-2 text-3xl font-bold text-gray-900">SGP</h1>
            <p className="text-gray-600">Sistema de Gestión de Proveedores</p>
          </div>

          {/* Error genérico */}
          {error && !error.is_inactive && (
            <div className="flex items-start p-4 mb-6 border border-red-200 bg-red-50 rounded-xl animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          )}

          {/* Error de cuenta inactiva */}
          {error && error.is_inactive && (
            <div className="mb-6 overflow-hidden border-2 border-amber-300 bg-amber-50 rounded-xl animate-shake">
              <div className="flex items-start gap-3 p-4">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-semibold text-amber-900">Cuenta inactiva</p>
                  <p className="text-sm text-amber-800">{error.message}</p>
                </div>
              </div>
              {error.contact_email && (
                <div className="flex items-center gap-3 px-4 py-3 border-t bg-amber-100 border-amber-200">
                  <Mail className="flex-shrink-0 w-4 h-4 text-amber-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-700 mb-0.5">Contacta al administrador:</p>
                    <a href={`mailto:${error.contact_email}`} className="block text-sm font-semibold truncate text-amber-900 hover:underline">
                      {error.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="usuario@ejemplo.com"
            />

            <div className="space-y-1.5">
              <Input
                label="Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              {/* ✅ Link de olvidé mi contraseña */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium transition-colors text-primary-600 hover:text-primary-800"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Iniciar sesión
            </Button>
          </form>

          {/* Credenciales de prueba */}
          <div className="p-4 mt-8 border bg-gradient-to-r from-primary-50 to-pink-50 rounded-xl border-primary-200">
            <p className="mb-2 text-xs font-semibold tracking-wide text-gray-700 uppercase">
              🔐 Credenciales de prueba
            </p>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-primary-700">Admin:</span>
                <code className="bg-white px-2 py-1 rounded font-mono text-[10px]">admin@sgp.local</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-accent-700">Compras:</span>
                <code className="bg-white px-2 py-1 rounded font-mono text-[10px]">compras@sgp.local</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-alert-700">Calidad:</span>
                <code className="bg-white px-2 py-1 rounded font-mono text-[10px]">calidad@sgp.local</code>
              </div>
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-primary-200">
                <span className="font-medium text-gray-700">Contraseña:</span>
                <code className="bg-white px-2 py-1 rounded font-mono text-[10px]">password</code>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-center text-gray-600">
          <p>© 2026 Sistema de Gestión de Proveedores</p>
        </div>
      </div>
    </div>
  );
};
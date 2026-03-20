import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../api/authService';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Ingresa tu correo electrónico'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-primary-50 via-white to-pink-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg rounded-2xl bg-gradient-primary">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h1>
          <p className="mt-2 text-sm text-gray-500">
            Ingresa tu correo y te enviaremos un enlace para restablecerla
          </p>
        </div>

        <div className="p-8 bg-white border border-gray-100 shadow-xl rounded-2xl">
          {sent ? (
            // ✅ Estado de éxito
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Revisa tu correo</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Si <span className="font-semibold text-gray-800">{email}</span> está registrado,
                  recibirás un enlace en los próximos minutos.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Revisa también tu carpeta de spam si no lo ves.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm font-medium underline text-primary-600 hover:text-primary-800"
              >
                Enviar a otro correo
              </button>
            </div>
          ) : (
            // ✅ Formulario
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="tu@correo.com"
                    autoFocus
                    className={`w-full pl-9 pr-4 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                      ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-primary'}`}
                  />
                </div>
                {error && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl bg-gradient-primary hover:shadow-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
              </button>
            </form>
          )}

          {/* Volver al login */}
          <div className="pt-5 mt-6 text-center border-t border-gray-100">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
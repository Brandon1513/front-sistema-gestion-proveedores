import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../api/authService';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

const PasswordInput = ({ label, value, onChange, error, placeholder, autoFocus }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block mb-1.5 text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || '••••••••'}
          autoFocus={autoFocus}
          className={`w-full pl-9 pr-10 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
            ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-primary'}`}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    </div>
  );
};

export const ResetPasswordPage = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword]               = useState('');
  const [passwordConfirmation, setConfirmation] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [errors, setErrors]                   = useState({});
  const [generalError, setGeneralError]       = useState('');

  // Validar link
  const isValidLink = token && email;

  const getStrengthBars = () => [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    // Validaciones locales
    const localErrors = {};
    if (!password)                     localErrors.password = 'La contraseña es requerida';
    else if (password.length < 8)      localErrors.password = 'Mínimo 8 caracteres';
    if (!passwordConfirmation)         localErrors.password_confirmation = 'Confirma tu contraseña';
    else if (password !== passwordConfirmation) localErrors.password_confirmation = 'Las contraseñas no coinciden';
    if (Object.keys(localErrors).length > 0) { setErrors(localErrors); return; }

    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
      // Redirigir al login después de 3 segundos
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      setGeneralError(data?.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.');
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
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-gray-500">Ingresa y confirma tu nueva contraseña</p>
        </div>

        <div className="p-8 bg-white border border-gray-100 shadow-xl rounded-2xl">
          {/* Link inválido */}
          {!isValidLink ? (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Enlace inválido</h2>
                <p className="mt-2 text-sm text-gray-600">Este enlace no es válido o ha expirado.</p>
              </div>
              <Link to="/forgot-password" className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-primary">
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : success ? (
            // ✅ Éxito
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¡Contraseña actualizada!</h2>
                <p className="mt-2 text-sm text-gray-600">Tu contraseña fue restablecida correctamente.</p>
                <p className="mt-1 text-xs text-gray-400">Serás redirigido al login en unos segundos...</p>
              </div>
              <Link to="/login" className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-primary">
                Ir al login ahora
              </Link>
            </div>
          ) : (
            // ✅ Formulario
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email de referencia */}
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Restableciendo contraseña para:</p>
                <p className="text-sm font-semibold text-gray-800">{email}</p>
              </div>

              <PasswordInput
                label="Nueva contraseña"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                error={errors.password?.[0] || errors.password}
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />

              {/* Barra de fortaleza */}
              {password && (
                <div className="-mt-2 space-y-1">
                  <div className="flex gap-1">
                    {getStrengthBars().map((met, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${met ? 'bg-green-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Recomendado: mayúsculas, números y caracteres especiales</p>
                </div>
              )}

              <PasswordInput
                label="Confirmar contraseña"
                value={passwordConfirmation}
                onChange={(e) => { setConfirmation(e.target.value); setErrors({}); }}
                error={errors.password_confirmation?.[0] || errors.password_confirmation}
                placeholder="Repite tu nueva contraseña"
              />

              {/* Error general (token expirado, etc.) */}
              {generalError && (
                <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{generalError}</p>
                    <Link to="/forgot-password" className="inline-block mt-1 text-xs text-red-600 underline hover:text-red-800">
                      Solicitar nuevo enlace
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl bg-gradient-primary hover:shadow-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

          <div className="pt-5 mt-6 text-center border-t border-gray-100">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
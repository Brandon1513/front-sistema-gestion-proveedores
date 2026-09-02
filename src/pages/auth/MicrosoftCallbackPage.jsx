import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../api/authService';
import { Loader2, AlertCircle } from 'lucide-react';

export const MicrosoftCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const hasRun = useRef(false); // evita doble ejecución en StrictMode/dev

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');

    if (!code) {
      navigate('/login?ms_error=missing_code', { replace: true });
      return;
    }

    authService
      .exchangeMicrosoftCode(code)
      .then((response) => {
        setAuth(response.user, response.token);

        const userRoles = response.user.roles || [];
        if (userRoles.includes('proveedor')) {
          navigate('/provider/dashboard', { replace: true });
        } else if (userRoles.includes('emp_solicitante')) {
          navigate('/my-requests', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login?ms_error=exchange_failed', { replace: true });
      });
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="flex flex-col items-center gap-3 p-8 text-center bg-white rounded-2xl shadow-elevated">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm text-gray-600">Completando inicio de sesión con Microsoft…</p>
      </div>
    </div>
  );
};
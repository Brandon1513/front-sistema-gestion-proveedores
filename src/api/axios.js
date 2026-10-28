import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Interceptor para agregar el token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Evita que varios 401 simultáneos (dashboard, pending, notifications...)
// disparen cada uno su propia redirección
let isRedirecting = false;
let redirectReason = 'unauthorized';

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/login');

    // Si falla el login (credenciales inválidas), dejamos que el formulario
    // maneje su propio mensaje de error, sin forzar redirección.
    if (status === 401 && !isLoginRequest) {
      // Si cualquiera de los 401 trae SESSION_EXPIRED, ese motivo gana
      if (error.response?.data?.error_code === 'SESSION_EXPIRED') {
        redirectReason = 'expired';
      }

      if (!isRedirecting) {
        isRedirecting = true;

        // Usar el logout del store: limpia token, user y auth-storage.
        // Si quedara isAuthenticated: true en Zustand, las rutas protegidas
        // regresarían al dashboard y se formaría un ciclo de recargas
        useAuthStore.getState().logout();

        // Pequeña espera para que lleguen los demás 401 en vuelo y se
        // conozca el motivo real (expired vs unauthorized)
        setTimeout(() => {
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = `/login?reason=${redirectReason}`;
          } else {
            isRedirecting = false;
          }
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios';

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

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/login');

    // Si falla el login (credenciales inválidas), dejamos que el formulario
    // maneje su propio mensaje de error, sin forzar redirección.
    if (status === 401 && !isLoginRequest) {
      const errorCode = error.response?.data?.error_code;
      const reason = errorCode === 'SESSION_EXPIRED' ? 'expired' : 'unauthorized';

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `/login?reason=${reason}`;
    }

    return Promise.reject(error);
  }
);

export default api;
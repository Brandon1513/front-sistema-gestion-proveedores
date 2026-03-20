import api from './axios';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  me: async () => {
    const response = await api.get('/me');
    return response.data;
  },

  // ✅ Solicitar link de restablecimiento
  forgotPassword: async (email) => {
    const response = await api.post('/forgot-password', { email });
    return response.data;
  },

  // ✅ Restablecer contraseña con token del email
  resetPassword: async (data) => {
    const response = await api.post('/reset-password', data);
    return response.data;
  },
};
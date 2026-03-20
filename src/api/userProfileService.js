import api from './axios';

export const userProfileService = {
  // Obtener perfil propio
  getProfile: async () => {
    const response = await api.get('/me/profile');
    return response.data;
  },

  // Actualizar nombre y email
  updateProfile: async (data) => {
    const response = await api.put('/me/profile', data);
    return response.data;
  },

  // Cambiar contraseña
  updatePassword: async (data) => {
    const response = await api.patch('/me/password', data);
    return response.data;
  },
};
import api from './axios';

export const userService = {
  // Listar usuarios con filtros
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Obtener un usuario específico
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Crear un nuevo usuario
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Actualizar un usuario
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Cambiar contraseña de un usuario
  updatePassword: async (id, passwordData) => {
    const response = await api.patch(`/users/${id}/password`, passwordData);
    return response.data;
  },

  // Activar/Desactivar usuario
  toggleStatus: async (id) => {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  },

  // Eliminar un usuario
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Obtener roles disponibles
  getRoles: async () => {
    const response = await api.get('/users/roles');
    return response.data;
  },
};
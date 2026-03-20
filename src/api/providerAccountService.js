import api from './axios';

export const providerAccountService = {
  getAll: async (filters = {}) => {
    const response = await api.get('/provider-accounts', { params: filters });
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/provider-accounts/${id}/toggle-status`);
    return response.data;
  },

  resetPassword: async (id, data) => {
    const response = await api.patch(`/provider-accounts/${id}/reset-password`, data);
    return response.data;
  },

  sendReset: async (id) => {
    const response = await api.post(`/provider-accounts/${id}/send-reset`);
    return response.data;
  },
};
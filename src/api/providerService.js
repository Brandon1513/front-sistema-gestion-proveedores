import api from './axios';

export const providerService = {
  getAll: async (params) => {
    const response = await api.get('/providers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/providers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/providers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/providers/${id}`);
    return response.data;
  },

  updateStatus: async (id, status, observations) => {
    const response = await api.patch(`/providers/${id}/status`, {
      status,
      observations,
    });
    return response.data;
  },
};
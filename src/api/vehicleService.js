import api from './axios';

export const vehicleService = {
  getAll: async (providerId) => {
    const response = await api.get(`/providers/${providerId}/vehicles`);
    return response.data;
  },

  create: async (providerId, data) => {
    const response = await api.post(`/providers/${providerId}/vehicles`, data);
    return response.data;
  },

  update: async (providerId, vehicleId, data) => {
    const response = await api.put(`/providers/${providerId}/vehicles/${vehicleId}`, data);
    return response.data;
  },

  delete: async (providerId, vehicleId) => {
    const response = await api.delete(`/providers/${providerId}/vehicles/${vehicleId}`);
    return response.data;
  },
};
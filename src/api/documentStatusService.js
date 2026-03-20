import api from './axios';

export const documentStatusService = {
  getAll: async (filters = {}) => {
    const response = await api.get('/documents/status', { params: filters });
    return response.data;
  },
};
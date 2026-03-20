import api from './axios';

export const providerTypeService = {
  getAll: async () => {
    const response = await api.get('/provider-types');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/provider-types/${id}`);
    return response.data;
  },

  getRequiredDocuments: async (id) => {
    const response = await api.get(`/provider-types/${id}/required-documents`);
    return response.data;
  },
};
import api from './axios';

export const providerCertificationService = {
  getAll: async () => {
    const response = await api.get('/provider/certifications');
    return response.data;
  },

  create: async (formData) => {
    // formData es un FormData con archivo
    const response = await api.post('/provider/certifications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id, formData) => {
    // Laravel no acepta PUT con FormData — usar POST con _method=PUT
    formData.append('_method', 'PUT');
    const response = await api.post(`/provider/certifications/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/provider/certifications/${id}`);
    return response.data;
  },

  download: async (id) => {
    const response = await api.get(`/provider/certifications/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  },
};
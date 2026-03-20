import api from './axios';

export const certificationService = {
  // ✅ Todas las certificaciones (vista interna)
  getAll: async (filters = {}) => {
    const response = await api.get('/certifications', { params: filters });
    return response.data;
  },

  // Por proveedor específico
  getByProvider: async (providerId) => {
    const response = await api.get(`/providers/${providerId}/certifications`);
    return response.data;
  },

  create: async (providerId, data) => {
    const response = await api.post(`/providers/${providerId}/certifications`, data);
    return response.data;
  },

  update: async (providerId, certId, data) => {
    const response = await api.put(`/providers/${providerId}/certifications/${certId}`, data);
    return response.data;
  },

  delete: async (providerId, certId) => {
    const response = await api.delete(`/providers/${providerId}/certifications/${certId}`);
    return response.data;
  },

  // ✅ Validar certificación (Calidad)
  validate: async (providerId, certId, data) => {
    const response = await api.post(
      `/providers/${providerId}/certifications/${certId}/validate`,
      data
    );
    return response.data;
  },

  // ✅ Descargar archivo adjunto (vista interna)
  download: async (providerId, certId, fileName) => {
    const response = await api.get(
      `/providers/${providerId}/certifications/${certId}/download`,
      { responseType: 'blob' }
    );
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', fileName || `certificacion_${certId}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ✅ Conteo de pendientes (para badge)
  getPendingCount: async () => {
    const response = await api.get('/certifications/pending-count');
    return response.data;
  },
};
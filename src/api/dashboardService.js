import api from './axios';

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/dashboard/statistics');
    return response.data;
  },

  // ✅ Todos los documentos por vencer sin límite — para exportación
  getExpiringDocuments: async (days = 30) => {
    const response = await api.get('/documents/expiring', { params: { days } });
    return response.data;
  },
};
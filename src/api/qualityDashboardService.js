import api from './axios';

export const qualityDashboardService = {
  // Obtener estadísticas del dashboard
  getStats: async (period = 'month') => {
    const response = await api.get(`/quality/dashboard/stats?period=${period}`);
    return response.data;
  },

  // Obtener actividad reciente
  getRecentActivity: async (limit = 10) => {
    const response = await api.get(`/quality/dashboard/activity?limit=${limit}`);
    return response.data;
  },
};
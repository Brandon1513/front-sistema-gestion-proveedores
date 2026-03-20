import api from './axios';

export const providerDashboardService = {
  // Obtener estadísticas del dashboard
  getStats: async () => {
    const response = await api.get('/provider/dashboard/stats');
    return response.data;
  },

  // Obtener documentos del proveedor
  getDocuments: async () => {
    const response = await api.get('/provider/documents');
    return response.data;
  },

  // Obtener documentos requeridos
  getRequiredDocuments: async () => {
    const response = await api.get('/provider/documents/required');
    return response.data;
  },

  // Obtener documentos próximos a vencer
  getExpiringDocuments: async () => {
    const response = await api.get('/provider/documents/expiring');
    return response.data;
  },
};
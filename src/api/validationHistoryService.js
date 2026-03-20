import api from './axios';

export const validationHistoryService = {
  // Obtener historial de validaciones de un documento
  getHistory: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/history`);
    return response.data;
  },
};
import api from './axios';

export const documentValidationService = {
  // Obtener documentos pendientes de validación
  getPendingDocuments: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.provider_type) params.append('provider_type', filters.provider_type);
    if (filters.document_type) params.append('document_type', filters.document_type);
    
    const queryString = params.toString();
    const url = queryString ? `/documents/pending?${queryString}` : '/documents/pending';
    
    const response = await api.get(url);
    return response.data;
  },

  // Validar documento (aprobar o rechazar)
  validateDocument: async (providerId, documentId, data) => {
    const response = await api.post(
      `/providers/${providerId}/documents/${documentId}/validate`,
      data
    );
    return response.data;
  },
};
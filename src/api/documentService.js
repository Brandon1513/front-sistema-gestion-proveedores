import api from './axios';

export const documentService = {
  // Obtener documentos de un proveedor
  getByProvider: async (providerId) => {
    const response = await api.get(`/providers/${providerId}/documents`);
    return response.data;
  },

  // Obtener documentos requeridos
  getRequired: async (providerId) => {
    const response = await api.get(`/providers/${providerId}/documents/required`);
    return response.data;
  },

  // Subir documento
  upload: async (providerId, formData) => {
    const response = await api.post(`/providers/${providerId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * ⭐ NUEVO: Obtener URL para VER documento
   */
  getViewUrl: (providerId, documentId) => {
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';
  return `${API_URL}/providers/${providerId}/documents/${documentId}/view?token=${token}`;
},

  // Descargar documento
  download: async (providerId, documentId) => {
    try {
      const response = await api.get(
        `/providers/${providerId}/documents/${documentId}/download`,
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/octet-stream',
          },
        }
      );

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      let filename = `documento_${documentId}`;

      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Detectar el tipo de archivo del Content-Type
      const contentType = response.headers['content-type'];
      
      // Crear blob con el tipo correcto
      const blob = new Blob([response.data], { type: contentType || 'application/octet-stream' });
      
      // Crear URL del blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear elemento <a> para descarga
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      
      // Agregar al DOM, hacer click y remover
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      return { success: true, filename };
    } catch (error) {
      console.error('Error al descargar documento:', error);
      throw error;
    }
  },

  // Eliminar documento
  delete: async (providerId, documentId) => {
    const response = await api.delete(`/providers/${providerId}/documents/${documentId}`);
    return response.data;
  },

  // ===============================
  // VALIDACIÓN DE DOCUMENTOS
  // ===============================
  
  // Obtener documentos pendientes de validación
  getPending: async (filters = {}) => {
    const response = await api.get('/documents/pending', { params: filters });
    return response.data;
  },

  // Validar documento (aprobar o rechazar)
  validate: async (providerId, documentId, validationData) => {
    const response = await api.post(
      `/providers/${providerId}/documents/${documentId}/validate`,
      validationData
    );
    return response.data;
  },

  // Historial de validaciones de un documento
  getHistory: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/history`);
    return response.data;
  },
};
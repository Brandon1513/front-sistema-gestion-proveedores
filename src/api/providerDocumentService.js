import api from './axios';

// ✅ Obtener el token actual del store/localStorage
const getAuthToken = () => {
  // Intentar desde localStorage directamente
  const token = localStorage.getItem('token');
  if (token) return token;

  // Intentar desde el store de Zustand serializado
  try {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      return parsed?.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
};

export const providerDocumentService = {
  // Subir documento
  upload: async (data) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('document_type_id', data.document_type_id);
    if (data.issue_date)  formData.append('issue_date', data.issue_date);
    if (data.expiry_date) formData.append('expiry_date', data.expiry_date);

    const response = await api.post('/provider/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Eliminar documento
  delete: async (documentId) => {
    const response = await api.delete(`/provider/documents/${documentId}`);
    return response.data;
  },

  // Descargar documento
  download: async (documentId) => {
    try {
      const response = await api.get(`/provider/documents/${documentId}/download`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/octet-stream' },
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `documento_${documentId}`;
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches?.[1]) filename = matches[1].replace(/['"]/g, '');
      }

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);

      return { success: true, filename };
    } catch (error) {
      console.error('Error al descargar documento:', error);
      throw error;
    }
  },

  // ✅ Vista previa — abre el documento en una nueva pestaña
  preview: (providerId, documentId) => {
    const token = getAuthToken();
    if (!token) {
      console.error('No se encontró el token de autenticación');
      return false;
    }

    // El backend acepta el token como query param para rutas de vista
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost/api';
    const url = `${baseUrl}/providers/${providerId}/documents/${documentId}/view?token=${token}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  },
};
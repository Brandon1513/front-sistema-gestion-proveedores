import api from './axios';

// Descarga autenticada de cualquier archivo servido por la API
export const downloadFile = async (url, filename) => {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl  = window.URL.createObjectURL(new Blob([response.data]));
  const link     = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename || 'archivo');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const changeRequestService = {
  // ─── Portal proveedor ──────────────────────────────────────────────────────
  getForDocument: (documentTypeId) =>
    api.get(`/provider/change-requests/document-type/${documentTypeId}`).then(r => r.data),

  create: ({ documentTypeId, description, images = [] }) => {
    const fd = new FormData();
    fd.append('document_type_id', documentTypeId);
    fd.append('description', description);
    images.forEach(img => fd.append('images[]', img));
    return api.post('/provider/change-requests', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  downloadPersonalized: (id, filename) =>
    downloadFile(`/provider/change-requests/${id}/personalized`, filename),

  // ─── Bandeja interna ───────────────────────────────────────────────────────
  list: (params) => api.get('/change-requests', { params }).then(r => r.data),

  show: (id) => api.get(`/change-requests/${id}`).then(r => r.data),

  resolve: (id, { resolution, file, notes }) => {
    const fd = new FormData();
    fd.append('resolution', resolution);
    if (file)  fd.append('file', file);
    if (notes) fd.append('response_notes', notes);
    return api.post(`/change-requests/${id}/resolve`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  fetchImageBlob: (id, imageId) =>
    api.get(`/change-requests/${id}/images/${imageId}`, { responseType: 'blob' }).then(r => r.data),

  downloadResponseFile: (id, filename) =>
    downloadFile(`/change-requests/${id}/response-file`, filename),
};
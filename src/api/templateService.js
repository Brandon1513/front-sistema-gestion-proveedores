import api from './axios';

// ── Sistema viejo (por producto / tipo de carta) — usado solo por
//    carta_garantia y carta_no_trabajo_infantil, vía TemplatesPanel.jsx ──
export const templateService = {
  getAll:             (docTypeId) => api.get('/document-templates', { params: { document_type_id: docTypeId } }).then(r => r.data),
  getCatalogProducts: ()          => api.get('/document-templates/catalog-products').then(r => r.data),
  upload:             (formData)  => api.post('/document-templates', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  delete:             (id)        => api.delete(`/document-templates/${id}`).then(r => r.data),
  download:           (id)        => api.get(`/document-templates/${id}/download`, { responseType: 'blob' }),
};

// ── Sistema nuevo (plantillas de apoyo genéricas, cualquier documento) —
//    usado por GenericTemplatesSection.jsx dentro del modal ──
export const genericTemplateService = {
  getAll: (documentTypeId) =>
    api.get(`/document-templates/generic/${documentTypeId}`).then(r => r.data),
  upload: (documentTypeId, files) => {
    const formData = new FormData();
    formData.append('document_type_id', documentTypeId);
    files.forEach(f => formData.append('files[]', f));
    return api.post('/document-templates/generic', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  delete:   (id) => api.delete(`/document-templates/${id}`).then(r => r.data),
  download: (id) => api.get(`/document-templates/${id}/download`, { responseType: 'blob' }),
};
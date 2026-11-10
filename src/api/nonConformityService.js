import api from './axios';

// Reduce la foto a máx. 1600 px por lado y JPEG al 80% antes de subirla.
// Si el navegador no puede leer la imagen, se envía el archivo original.
export const compressImage = (file, maxDim = 1600, quality = 0.8) => new Promise((resolve) => {
  if (!file.type?.startsWith('image/')) { resolve(file); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale  = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) { resolve(file); return; }
      const name = (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg';
      resolve(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', quality);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

const saveBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.setAttribute('download', filename);
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
};

const SECTION1_FIELDS = [
  'provider_id', 'product_service_id', 'lot', 'deviation_date', 'reception_date',
  'quantity_involved', 'unit_id', 'non_conformity_type_id', 'description',
  'immediate_action', 'immediate_action_date',
];

export const nonConformityService = {
  // ── Vista interna ─────────────────────────────────────────────────────────
  getAll:   async (params = {}) => (await api.get('/non-conformities', { params })).data,
  getById:  async (id) => (await api.get(`/non-conformities/${id}`)).data,
  getTypes: async () => (await api.get('/non-conformities/types')).data,
  getProviderProducts: async (providerId) => (await api.get(`/non-conformities/provider-products/${providerId}`)).data,

  // Alta con fotos (multipart)
  create: async (data, photos = []) => {
    const fd = new FormData();
    SECTION1_FIELDS.forEach(k => {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') fd.append(k, data[k]);
    });
    for (const file of photos) fd.append('photos[]', await compressImage(file));
    return (await api.post('/non-conformities', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },

  // Edición de la Sección 1 (sin fotos; las fotos van por su propio endpoint)
  update: async (id, data) => {
    const payload = Object.fromEntries(SECTION1_FIELDS.map(k => [k, data[k] === '' ? null : data[k]]));
    return (await api.put(`/non-conformities/${id}`, payload)).data;
  },

  remove: async (id) => (await api.delete(`/non-conformities/${id}`)).data,

  uploadPhotos: async (id, files) => {
    const fd = new FormData();
    for (const file of files) fd.append('photos[]', await compressImage(file));
    return (await api.post(`/non-conformities/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  deletePhoto: async (photoId) => (await api.delete(`/non-conformities/photos/${photoId}`)).data,

  // Foto como blob (requiere el token, por eso no se usa la URL directa en <img>)
  getPhotoBlob: async (photoId) => (await api.get(`/non-conformity-photos/${photoId}`, { responseType: 'blob' })).data,

  // Sección 2: el ingeniero acepta o regresa la respuesta ({ decision: 'accept'|'return', comment })
  reviewResponse: async (id, responseId, data) =>
    (await api.post(`/non-conformities/${id}/responses/${responseId}/review`, data)).data,

  // Sección 3: Cumple / No cumple de una evidencia ({ decision: 'accept'|'reject', comment })
  reviewEvidence: async (id, evidenceId, data) =>
    (await api.post(`/non-conformities/${id}/evidences/${evidenceId}/review`, data)).data,

  // Cierre (firma electrónica = usuario + fecha)
  close: async (id, comment) => (await api.post(`/non-conformities/${id}/close`, { comment: comment || undefined })).data,

  // Descarga de una evidencia (internos y el proveedor dueño)
  downloadEvidence: async (evidenceId, filename = 'evidencia') => {
    const r = await api.get(`/non-conformity-evidences/${evidenceId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = url; a.setAttribute('download', filename);
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
  },

  // PDF del formato F-CAL-24 lleno
  downloadPdf: async (id, folio = 'NC') => saveBlob(
    (await api.get(`/non-conformities/${id}/pdf`, { responseType: 'blob' })).data, `${folio} - F-CAL-24.pdf`),

  // Indicadores y Excel (super_admin, ingeniero_alimentos, compras)
  getStats: async (params = {}) => (await api.get('/non-conformities/stats', { params })).data,
  exportExcel: async (params = {}) => {
    const r = await api.get('/non-conformities/export', { params, responseType: 'blob' });
    const disposition = r.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = url; a.setAttribute('download', match ? match[1] : `no_conformidades_${Date.now()}.xlsx`);
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
  },

  // ── Portal del proveedor ──────────────────────────────────────────────────
  myAll:     async () => (await api.get('/provider/non-conformities')).data,
  myGetById: async (id) => (await api.get(`/provider/non-conformities/${id}`)).data,

  // Sección 2: { team_leader, area, root_cause, actions: [{ action, responsible, commitment_date, completion_date?, evidence_to_deliver }] }
  submitResponse: async (id, data) => (await api.post(`/provider/non-conformities/${id}/responses`, data)).data,

  myDownloadPdf: async (id, folio = 'NC') => saveBlob(
    (await api.get(`/provider/non-conformities/${id}/pdf`, { responseType: 'blob' })).data, `${folio} - F-CAL-24.pdf`),

  // Sección 3: evidencia de una acción (un archivo + comentario opcional)
  uploadEvidence: async (id, actionId, file, comment) => {
    const fd = new FormData();
    fd.append('file', file);
    if (comment) fd.append('comment', comment);
    return (await api.post(`/provider/non-conformities/${id}/actions/${actionId}/evidences`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
};
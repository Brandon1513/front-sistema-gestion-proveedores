import api from './axios';

export const appointmentService = {
  getAll: async (params = {}) => { const r = await api.get('/appointments', { params }); return r.data; },
  create: async (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k,v]) => { if (v !== null && v !== undefined && k !== 'attachment') fd.append(k,v); });
    if (data.attachment) fd.append('attachment', data.attachment);
    const r = await api.post('/appointments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },
  getById: async (id) => { const r = await api.get(`/appointments/${id}`); return r.data; },
  update: async (id, data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k,v]) => { if (v !== null && v !== undefined && k !== 'attachment') fd.append(k,v); });
    if (data.attachment) fd.append('attachment', data.attachment);
    fd.append('_method','PUT');
    const r = await api.post(`/appointments/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },
  cancel: async (id, reason = '') => { const r = await api.post(`/appointments/${id}/cancel`, { reason }); return r.data; },
  downloadAttachment: async (id, filename = 'adjunto') => {
    const r = await api.get(`/appointments/${id}/attachment`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a'); a.href = url; a.setAttribute('download', filename);
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
  },
  // Proveedor
  myAppointments: async (params = {}) => { const r = await api.get('/provider/appointments', { params }); return r.data; },
  providerComplete: async (id, data) => { const r = await api.post(`/provider/appointments/${id}/complete`, data); return r.data; },
  // Seguridad
  securityGetAppointments: async (params = {}) => { const r = await api.get('/security/appointments', { params }); return r.data; },
  getPhysicalDocsConfig: async (id) => { const r = await api.get(`/security/appointments/${id}/physical-docs-config`); return r.data; },
  confirmEntry: async (id, data) => { const r = await api.post(`/security/appointments/${id}/confirm-entry`, data); return r.data; },
  // Ingeniero
  foodEngineerGetAppointments: async (params = {}) => {
    const r = await api.get('/food-engineer/appointments', { params });
    return r.data;
  },
  registerReception: async (id, data) => {
    const fd = new FormData();
    fd.append('reception_status',  data.reception_status);
    fd.append('quantity_received', data.quantity_received);
    fd.append('unit_id',           data.unit_id);
    if (data.quantity_rejected)  fd.append('quantity_rejected',  data.quantity_rejected);
    if (data.rejection_reason)   fd.append('rejection_reason',   data.rejection_reason);
    if (data.reception_notes)    fd.append('reception_notes',    data.reception_notes);
    if (data.photos?.length) data.photos.forEach(p => fd.append('photos[]', p));
    const r = await api.post(`/food-engineer/appointments/${id}/reception`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
  // Unidades
  getUnits: async () => { const r = await api.get('/units'); return r.data; },
};
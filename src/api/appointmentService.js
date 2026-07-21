import api from './axios';

export const appointmentService = {
  // ── Compras ───────────────────────────────────────────────────────────────
  getAll: async (params = {}) => {
    const r = await api.get('/appointments', { params });
    return r.data;
  },
  create: async (data) => {
  const fd = new FormData();
  // Campos simples
  const simple = ['provider_id','appointment_date','appointment_time','duration_minutes','type','notes','status','products','rescheduled_from_id'];
  simple.forEach(k => { if (data[k] != null) fd.append(k, data[k]); });
  if (data.attachment) fd.append('attachment', data.attachment);
  // Items como JSON
  if (data.items?.length) fd.append('items', JSON.stringify(data.items));
  const r = await api.post('/appointments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return r.data;
  },
  getById: async (id) => { const r = await api.get(`/appointments/${id}`); return r.data; },
  update: async (id, data) => {
    const fd = new FormData();
    const simple = ['provider_id','appointment_date','appointment_time','duration_minutes','type','notes','status'];
    simple.forEach(k => { if (data[k] != null) fd.append(k, data[k]); });
    if (data.attachment) fd.append('attachment', data.attachment);
    if (data.items?.length) fd.append('items', JSON.stringify(data.items));
    fd.append('_method', 'PUT');
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
  // Productos del proveedor para nueva cita
  getProviderProducts: async (providerId) => {
    const r = await api.get(`/providers/${providerId}/appointment-products`);
    return r.data;
  },

  // ── Proveedor ─────────────────────────────────────────────────────────────
  myAppointments: async (params = {}) => { const r = await api.get('/provider/appointments', { params }); return r.data; },
  providerComplete: async (id, data) => { const r = await api.post(`/provider/appointments/${id}/complete`, data); return r.data; },

  // ── Seguridad ─────────────────────────────────────────────────────────────
  securityGetAppointments: async (params = {}) => { const r = await api.get('/security/appointments', { params }); return r.data; },
  getPhysicalDocsConfig: async (id) => { const r = await api.get(`/appointments/${id}/physical-docs-config`); return r.data; },
  confirmEntry: async (id, data) => { const r = await api.post(`/security/appointments/${id}/confirm-entry`, data); return r.data; },
  markNoShow: async (id, notes = '') => {
    const r = await api.post(`/security/appointments/${id}/no-show`, { no_show_notes: notes });
    return r.data;
  },

  // ── Ingeniero de Alimentos ────────────────────────────────────────────────
  foodEngineerGetAppointments: async (params = {}) => {
    const r = await api.get('/food-engineer/appointments', { params });
    return r.data;
  },
  registerReception: async (id, data) => {
    // data.items = [{ id, quantity_received, received_unit_id, quantity_rejected?, rejection_reason?, reception_notes? }]
    const r = await api.post(`/food-engineer/appointments/${id}/reception`, {
      reception_notes: data.reception_notes,
      items: data.items,
    });
    return r.data;
  },

  // ── Unidades ──────────────────────────────────────────────────────────────
  getUnits: async () => { const r = await api.get('/units'); return r.data; },
};
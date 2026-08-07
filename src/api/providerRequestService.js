import api from './axios';

export const providerRequestService = {
  // emp_solicitante
  create: async (data) => {
    const r = await api.post('/provider-requests', data);
    return r.data;
  },
  mine: async () => {
    const r = await api.get('/provider-requests/mine');
    return r.data;
  },

  // Compras / Admin
  getAll: async (params = {}) => {
    const r = await api.get('/provider-requests', { params });
    return r.data;
  },
  approve: async (id) => {
    const r = await api.post(`/provider-requests/${id}/approve`);
    return r.data;
  },
  reject: async (id, rejection_reason) => {
    const r = await api.post(`/provider-requests/${id}/reject`, { rejection_reason });
    return r.data;
  },
};
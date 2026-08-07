import api from './axios';

export const departmentService = {
  getAll: async (params = {}) => {
    const r = await api.get('/departments', { params });
    return r.data;
  },
  create: async (data) => {
    const r = await api.post('/departments', data);
    return r.data;
  },
  update: async (id, data) => {
    const r = await api.put(`/departments/${id}`, data);
    return r.data;
  },
};
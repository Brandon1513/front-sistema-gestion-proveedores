import api from './axios';

export const invitationService = {
  getAll: async (params) => {
    const response = await api.get('/invitations', { params });
    return response.data;
  },

  send: async (data) => {
    const response = await api.post('/invitations', data);
    return response.data;
  },

  resend: async (id) => {
    const response = await api.post(`/invitations/${id}/resend`);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.delete(`/invitations/${id}`);
    return response.data;
  },

  verify: async (token) => {
    const response = await api.get(`/invitations/verify/${token}`);
    return response.data;
  },
};
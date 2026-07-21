import api from './axios';

export const notificationService = {
  // Devuelve { notifications: [...], unread_count: number }
  getAll: async () => {
    const r = await api.get('/notifications');
    return r.data;
  },
  markRead: async (id) => {
    const r = await api.post(`/notifications/${id}/read`);
    return r.data;
  },
  markAllRead: async () => {
    const r = await api.post('/notifications/read-all');
    return r.data;
  },
};
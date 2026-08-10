import api from './axios';

export const docTypeService = {
  getAll:           () => api.get('/document-types').then(r => r.data),
  getProviderTypes: () => api.get('/document-types/provider-types').then(r => r.data),
  getGroups:        () => api.get('/document-types/groups').then(r => r.data),
  create:           (data) => api.post('/document-types', data).then(r => r.data),
  update:           (id, data) => api.put(`/document-types/${id}`, data).then(r => r.data),
  toggleActive:     (id) => api.patch(`/document-types/${id}/toggle-active`).then(r => r.data),
  reorder:          (data) => api.post('/document-types/reorder', data).then(r => r.data),
  removeFromProviderType: (id, provider_type_id) =>
    api.delete(`/document-types/${id}/provider-type`, { data: { provider_type_id } }).then(r => r.data),
  createGroup:  (data) => api.post('/document-types/groups', data).then(r => r.data),
  updateGroup:  (id, data) => api.put(`/document-types/groups/${id}`, data).then(r => r.data),
  deleteGroup:  (id) => api.delete(`/document-types/groups/${id}`).then(r => r.data),
  reorderGroups:(data) => api.post('/document-types/groups/reorder', data).then(r => r.data),
};
import api from './axios';

export const providerProfileService = {
  // Obtener perfil completo
  getProfile: async () => {
    const response = await api.get('/provider/profile');
    return response.data;
  },

  // Actualizar información general
  updateProfile: async (data) => {
    const response = await api.put('/provider/profile', data);
    return response.data;
  },

  // ========== CONTACTOS ==========
  getContacts: async () => {
    const response = await api.get('/provider/contacts');
    return response.data;
  },

  saveContact: async (data) => {
    const response = await api.post('/provider/contacts', data);
    return response.data;
  },

  deleteContact: async (contactId) => {
    const response = await api.delete(`/provider/contacts/${contactId}`);
    return response.data;
  },

  // ========== VEHÍCULOS ==========
  getVehicles: async () => {
    const response = await api.get('/provider/vehicles');
    return response.data;
  },

  saveVehicle: async (data) => {
    const response = await api.post('/provider/vehicles', data);
    return response.data;
  },

  deleteVehicle: async (vehicleId) => {
    const response = await api.delete(`/provider/vehicles/${vehicleId}`);
    return response.data;
  },

  // ========== PERSONAL ==========
  getPersonnel: async () => {
    const response = await api.get('/provider/personnel');
    return response.data;
  },

  savePersonnel: async (data) => {
    const response = await api.post('/provider/personnel', data);
    return response.data;
  },

  deletePersonnel: async (personnelId) => {
    const response = await api.delete(`/provider/personnel/${personnelId}`);
    return response.data;
  },
};
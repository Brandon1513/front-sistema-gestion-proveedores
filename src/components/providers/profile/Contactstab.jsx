import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerProfileService } from '../../../api/providerProfileService';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/Input';
import { Select } from '../../common/Select';
import { Plus, Edit2, Trash2, Save, Mail, Phone, User, Briefcase } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import toast from 'react-hot-toast';

export const ContactsTab = ({ providerId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    contact_type: 'sales',
    name: '',
    position: '',
    email: '',
    phone: '',
    extension: '',
    is_primary: false,
  });

  // Obtener contactos
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['provider-contacts'],
    queryFn: providerProfileService.getContacts,
  });

  // Mutation para guardar
  const saveMutation = useMutation({
    mutationFn: providerProfileService.saveContact,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-contacts']);
      setShowModal(false);
      resetForm();
      showToast.success(
        editingContact 
          ? '✓ Contacto actualizado correctamente' 
          : '🎉 Contacto agregado exitosamente'
      );
    },
    onError: (error) => {
      showToast.error(error.response?.data?.message || 'Error al guardar contacto');
    },
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: providerProfileService.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-contacts']);
      showToast.success('🗑️ Contacto eliminado correctamente');
    },
    onError: () => {
      showToast.error('Error al eliminar contacto');
    },
  });

  const resetForm = () => {
    setFormData({
      contact_type: 'sales',
      name: '',
      position: '',
      email: '',
      phone: '',
      extension: '',
      is_primary: false,
    });
    setEditingContact(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      contact_type: contact.type, // La BD usa 'type', no 'contact_type'
      name: contact.name,
      position: contact.position || '',
      email: contact.email,
      phone: contact.phone || '',
      extension: contact.extension || '',
      is_primary: contact.is_primary || false,
    });
    setShowModal(true);
  };

  const handleDelete = (contact) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">
          ¿Estás seguro de eliminar el contacto <span className="text-primary-600">"{contact.name}"</span>?
        </p>
        <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              deleteMutation.mutate(contact.id);
              toast.dismiss(t.id);
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: {
        maxWidth: '450px',
        padding: '20px',
        borderRadius: '16px',
        border: '2px solid #E5E7EB',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = editingContact ? { ...formData, id: editingContact.id } : formData;
    saveMutation.mutate(data);
  };

  const getContactTypeLabel = (type) => {
    const labels = {
      sales: 'Ventas',
      quality: 'Calidad',
      billing: 'Cobranza',
    };
    return labels[type] || type;
  };

  const getContactTypeVariant = (type) => {
    const variants = {
      sales: 'info',
      quality: 'success',
      billing: 'primary',
    };
    return variants[type] || 'info';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const contacts = contactsData?.contacts || [];

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-primary-600" />
              Contactos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona los contactos de tu empresa
            </p>
          </div>
          <Button 
            variant="primary" 
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
          >
            Agregar Contacto
          </Button>
        </div>
      </div>

      {/* Lista de contactos */}
      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-5 rounded-xl border-2 border-gray-200 bg-white hover:shadow-lg hover:border-primary-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-primary shadow-md flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{contact.name}</h3>
                      <Badge variant={getContactTypeVariant(contact.type)}>
                        {getContactTypeLabel(contact.type)}
                      </Badge>
                    </div>
                    {contact.position && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                        {contact.position}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2 text-primary-500 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </p>
                {contact.phone && (
                  <p className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-primary-500 flex-shrink-0" />
                    <span>
                      {contact.phone}
                      {contact.extension && <span className="ml-1 text-gray-500">Ext. {contact.extension}</span>}
                    </span>
                  </p>
                )}
                {contact.is_primary && (
                  <div className="pt-2">
                    <Badge variant="primary">Principal</Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
            <User className="w-8 h-8 text-primary-500" />
          </div>
          <p className="font-medium text-gray-900 mb-1">No hay contactos registrados</p>
          <p className="text-sm text-gray-600 mb-4">
            Agrega el primer contacto de tu empresa
          </p>
          <Button 
            variant="ghost" 
            onClick={handleAdd}
          >
            Agregar primer contacto
          </Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <span>{editingContact ? 'Editar Contacto' : 'Agregar Contacto'}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              loading={saveMutation.isPending}
              onClick={handleSubmit}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo de Contacto"
            name="contact_type"
            value={formData.contact_type}
            onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
            required
            options={[
              { value: 'sales', label: 'Ventas' },
              { value: 'quality', label: 'Calidad' },
              { value: 'billing', label: 'Cobranza' },
            ]}
          />

          <Input
            label="Nombre Completo"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Nombre del contacto"
          />

          <Input
            label="Puesto"
            name="position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Ej: Gerente de Ventas"
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
            placeholder="email@ejemplo.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              leftIcon={<Phone className="w-5 h-5 text-gray-400" />}
              placeholder="33 1234 5678"
            />

            <Input
              label="Extensión"
              name="extension"
              value={formData.extension}
              onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
              placeholder="123"
              maxLength={10}
            />
          </div>

          <div className="flex items-center p-3 rounded-lg bg-primary-50 border border-primary-200">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="is_primary" className="ml-2 text-sm font-medium text-gray-700">
              Marcar como contacto principal
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerProfileService } from '../../../api/providerProfileService';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/Input';
import { UserCheck, Plus, Edit2, Trash2, Save, CreditCard, Briefcase } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import toast from 'react-hot-toast';

export const PersonnelTab = ({ providerId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    identification_number: '',
    is_active: true,
  });

  const { data: personnelData, isLoading } = useQuery({
    queryKey: ['provider-personnel'],
    queryFn: providerProfileService.getPersonnel,
  });

  const saveMutation = useMutation({
    mutationFn: providerProfileService.savePersonnel,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-personnel']);
      setShowModal(false);
      resetForm();
      showToast.success(
        editingPersonnel 
          ? '✓ Personal actualizado correctamente' 
          : '🎉 Personal agregado exitosamente'
      );
    },
    onError: () => {
      showToast.error('Error al guardar personal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: providerProfileService.deletePersonnel,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-personnel']);
      showToast.success('🗑️ Personal eliminado correctamente');
    },
    onError: () => {
      showToast.error('Error al eliminar personal');
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      position: '',
      identification_number: '',
      is_active: true,
    });
    setEditingPersonnel(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (personnel) => {
    setEditingPersonnel(personnel);
    setFormData({
      full_name: personnel.full_name,
      position: personnel.position || '',
      identification_number: personnel.identification_number || '',
      is_active: personnel.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleDelete = (personnel) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">
          ¿Estás seguro de eliminar a <span className="text-primary-600">"{personnel.full_name}"</span>?
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
              deleteMutation.mutate(personnel.id);
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
    const data = editingPersonnel ? { ...formData, id: editingPersonnel.id } : formData;
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const personnel = personnelData?.personnel || [];

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary-600" />
              Personal Autorizado
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personal autorizado para visitas a las instalaciones
            </p>
          </div>
          <Button 
            variant="primary" 
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
          >
            Agregar Personal
          </Button>
        </div>
      </div>

      {/* Lista de personal */}
      {personnel.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personnel.map((person) => (
            <div
              key={person.id}
              className="p-5 rounded-xl border-2 border-gray-200 bg-white hover:shadow-lg hover:border-primary-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{person.full_name}</h3>
                      <Badge variant={person.is_active ? 'active' : 'inactive'}>
                        {person.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {person.position && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                        {person.position}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(person)}
                    className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(person)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {person.identification_number && (
                <div className="p-3 rounded-lg bg-primary-50 border border-primary-200">
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="font-medium">ID:</span>
                    <span className="font-mono font-semibold">{person.identification_number}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
          <p className="font-medium text-gray-900 mb-1">No hay personal registrado</p>
          <p className="text-sm text-gray-600 mb-4">
            Agrega el personal autorizado para visitas
          </p>
          <Button 
            variant="ghost" 
            onClick={handleAdd}
          >
            Agregar primer personal
          </Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <span>{editingPersonnel ? 'Editar Personal' : 'Agregar Personal'}</span>
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
          <Input
            label="Nombre Completo"
            name="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            placeholder="Ej: Juan Pérez García"
          />

          <Input
            label="Puesto"
            name="position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Ej: Gerente Administrativo"
            leftIcon={<Briefcase className="w-5 h-5 text-gray-400" />}
          />

          <Input
            label="No. Identificación"
            name="identification_number"
            value={formData.identification_number}
            onChange={(e) => setFormData({ ...formData, identification_number: e.target.value })}
            placeholder="Ej: 564MX"
            leftIcon={<CreditCard className="w-5 h-5 text-gray-400" />}
            helperText="Número de identificación o credencial"
          />

          <div className={`
            flex items-center p-3 rounded-lg border-2 transition-all duration-200
            ${formData.is_active 
              ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-300' 
              : 'bg-gradient-to-r from-gray-50 to-gray-50/50 border-gray-300'
            }
          `}>
            <input
              type="checkbox"
              id="is_active_personnel"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 border-gray-300 rounded text-green-600 focus:ring-green-500"
            />
            <label htmlFor="is_active_personnel" className="ml-2 text-sm font-medium text-gray-700">
              Personal activo y autorizado
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
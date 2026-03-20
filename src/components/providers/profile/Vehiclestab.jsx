import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerProfileService } from '../../../api/providerProfileService';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/Input';
import { Truck, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import toast from 'react-hot-toast';

export const VehiclesTab = ({ providerId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    brand_model: '',
    color: '',
    plates: '',
    is_active: true,
  });

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['provider-vehicles'],
    queryFn: providerProfileService.getVehicles,
  });

  const saveMutation = useMutation({
    mutationFn: providerProfileService.saveVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-vehicles']);
      handleCloseModal();
      showToast.success(
        editingVehicle 
          ? '✓ Vehículo actualizado correctamente' 
          : '🎉 Vehículo agregado exitosamente'
      );
    },
    onError: () => {
      showToast.error('Error al guardar vehículo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: providerProfileService.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-vehicles']);
      showToast.success('🗑️ Vehículo eliminado correctamente');
    },
    onError: () => {
      showToast.error('Error al eliminar vehículo');
    },
  });

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        id: vehicle.id,
        brand_model: vehicle.brand_model,
        color: vehicle.color || '',
        plates: vehicle.plates,
        is_active: vehicle.is_active ?? true,
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        brand_model: '',
        color: '',
        plates: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (vehicle) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">
          ¿Estás seguro de eliminar el vehículo <span className="text-primary-600">"{vehicle.brand_model}"</span>?
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
              deleteMutation.mutate(vehicle.id);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const vehicles = vehiclesData?.vehicles || [];

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary-600" />
              Vehículos Autorizados
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Registra los vehículos autorizados para acceso a las instalaciones
            </p>
          </div>
          <Button 
            variant="primary" 
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenModal()}
          >
            Agregar Vehículo
          </Button>
        </div>
      </div>

      {/* Lista de vehículos */}
      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="p-5 rounded-xl border-2 border-gray-200 bg-white hover:shadow-lg hover:border-primary-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{vehicle.brand_model}</h3>
                      <Badge variant={vehicle.is_active ? 'active' : 'inactive'}>
                        {vehicle.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleOpenModal(vehicle)}
                    className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary-50 border border-primary-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Placas</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">{vehicle.plates}</p>
                </div>
                {vehicle.color && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Color</p>
                    <p className="text-sm font-bold text-gray-900">{vehicle.color}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <Truck className="w-8 h-8 text-blue-500" />
          </div>
          <p className="font-medium text-gray-900 mb-1">No hay vehículos registrados</p>
          <p className="text-sm text-gray-600 mb-4">
            Agrega los vehículos autorizados para acceso
          </p>
          <Button 
            variant="ghost" 
            onClick={() => handleOpenModal()}
          >
            Agregar primer vehículo
          </Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span>{editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={handleCloseModal}
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
            label="Marca y Modelo"
            name="brand_model"
            value={formData.brand_model}
            onChange={(e) => setFormData({ ...formData, brand_model: e.target.value })}
            required
            placeholder="Ej: Ford Raptor 2026"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Color"
              name="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="Ej: Plata"
            />

            <Input
              label="Placas"
              name="plates"
              value={formData.plates}
              onChange={(e) => setFormData({ ...formData, plates: e.target.value.toUpperCase() })}
              required
              placeholder="Ej: YXML5"
              helperText="Se convertirá a mayúsculas"
            />
          </div>

          <div className={`
            flex items-center p-3 rounded-lg border-2 transition-all duration-200
            ${formData.is_active 
              ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-300' 
              : 'bg-gradient-to-r from-gray-50 to-gray-50/50 border-gray-300'
            }
          `}>
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
              Vehículo activo y autorizado
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
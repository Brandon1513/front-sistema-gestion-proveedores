import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Truck, AlertCircle } from 'lucide-react';

export const VehicleModal = ({ isOpen, onClose, onSave, vehicle = null }) => {
  const [formData, setFormData] = useState({
    plates: '',
    brand_model: '',
    color: '',
    is_active: true,
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plates: vehicle.plates || '',
        brand_model: vehicle.brand_model || '',
        color: vehicle.color || '',
        is_active: vehicle.is_active ?? true,
      });
    } else {
      setFormData({
        plates: '',
        brand_model: '',
        color: '',
        is_active: true,
      });
    }
  }, [vehicle, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span>{vehicle ? 'Editar Vehículo' : 'Agregar Vehículo'}</span>
        </div>
      }
      size="md"
      footer={
        <>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant="primary"
            onClick={handleSubmit}
          >
            {vehicle ? 'Actualizar' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Información básica */}
        <div className="p-4 border rounded-xl bg-primary-50 border-primary-200">
          <p className="mb-3 text-sm font-semibold text-primary-900">
            Información del Vehículo
          </p>
          <div className="space-y-4">
            <Input
              label="Placas"
              name="plates"
              value={formData.plates}
              onChange={handleChange}
              required
              placeholder="ABC-123-XYZ"
              helperText="Formato: AAA-###-AAA"
            />

            <Input
              label="Marca y Modelo"
              name="brand_model"
              value={formData.brand_model}
              onChange={handleChange}
              required
              placeholder="Ej: Ford F-150, Chevrolet Silverado"
              helperText="Incluye marca, modelo y año si es relevante"
            />

            <Input
              label="Color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="Ej: Blanco, Negro, Gris Plata"
              helperText="Color principal del vehículo"
            />
          </div>
        </div>

        {/* Estado del vehículo */}
        <div className={`
          p-4 rounded-xl border-2 transition-all duration-200
          ${formData.is_active 
            ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-300' 
            : 'bg-gradient-to-r from-gray-50 to-gray-50/50 border-gray-300'
          }
        `}>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="flex items-center h-6">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 transition-all border-2 border-gray-300 rounded-lg cursor-pointer text-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex-1">
              <span className="block mb-1 text-sm font-semibold text-gray-900">
                Vehículo activo
              </span>
              <span className="block text-xs text-gray-600">
                {formData.is_active 
                  ? 'Este vehículo está autorizado para ingresar a las instalaciones' 
                  : 'Este vehículo no está autorizado actualmente'
                }
              </span>
            </div>
          </label>
        </div>

        {/* Información adicional */}
        <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Nota importante</p>
              <p>
                Solo los vehículos marcados como activos podrán ingresar a las instalaciones. 
                Actualiza el estado cuando sea necesario.
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
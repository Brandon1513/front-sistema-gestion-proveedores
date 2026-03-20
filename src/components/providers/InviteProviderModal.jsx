import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { invitationService } from '../../api/invitationService';
import { providerTypeService } from '../../api/providerTypeService';
import { AlertCircle, CheckCircle, Mail, Send } from 'lucide-react';

export const InviteProviderModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    provider_type_id: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Obtener tipos de proveedores
  const { data: typesData, isLoading: loadingTypes } = useQuery({
    queryKey: ['provider-types'],
    queryFn: providerTypeService.getAll,
    enabled: isOpen,
  });

  // Mutación para enviar invitación
  const mutation = useMutation({
    mutationFn: invitationService.send,
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al enviar invitación');
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.provider_type_id) {
      setError('Todos los campos son requeridos');
      return;
    }

    mutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({ email: '', provider_type_id: '' });
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
            <Send className="w-5 h-5 text-white" />
          </div>
          <span>Invitar Proveedor</span>
        </div>
      }
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={mutation.isPending}
            disabled={success}
            onClick={handleSubmit}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Enviar Invitación
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mensaje de éxito */}
        {success && (
          <div className="p-4 border-2 border-green-300 rounded-xl bg-gradient-to-r from-green-50 to-green-50/50 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="mb-1 text-sm font-bold text-green-900">
                  ¡Invitación Enviada!
                </p>
                <p className="text-sm text-green-700">
                  El proveedor recibirá un correo electrónico con las instrucciones para registrarse.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="p-4 border-2 border-red-300 rounded-xl bg-red-50 animate-shake">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Información */}
        <div className="p-4 border rounded-xl bg-primary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-primary-900">
                ¿Cómo funciona?
              </p>
              <p className="text-primary-700">
                El proveedor recibirá un correo electrónico con un enlace único para completar su registro y subir la documentación requerida.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <Input
          label="Correo electrónico del proveedor"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="proveedor@ejemplo.com"
          leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
          helperText="El proveedor recibirá la invitación en este correo"
        />

        <Select
          label="Tipo de proveedor"
          name="provider_type_id"
          value={formData.provider_type_id}
          onChange={handleChange}
          options={typesData?.provider_types?.map(type => ({
            value: type.id,
            label: type.name,
          })) || []}
          required
          helperText="Selecciona el tipo que mejor describa al proveedor"
        />

        {loadingTypes && (
          <div className="py-4 text-center">
            <div className="w-6 h-6 mx-auto border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando tipos de proveedor...</p>
          </div>
        )}

        {/* Información adicional */}
        <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Nota importante</p>
              <p>El enlace de invitación expirará en 7 días. Asegúrate de que el correo electrónico sea correcto.</p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
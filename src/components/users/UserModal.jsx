import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../api/userService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { X, Save, UserPlus } from 'lucide-react';

export const UserModal = ({ isOpen, onClose, user, isEditing }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'compras',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  // Query para obtener roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: userService.getRoles,
    enabled: isOpen,
  });

  const roles = rolesData || [];

  // Cargar datos del usuario al editar
  useEffect(() => {
    if (isEditing && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        password_confirmation: '',
        role: user.roles[0]?.name || 'compras',
        is_active: user.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'compras',
        is_active: true,
      });
    }
    setErrors({});
  }, [user, isEditing, isOpen]);

  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    },
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    },
  });

  // ✅ CORREGIDO: Usar isPending en lugar de isLoading
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevenir envíos múltiples
    if (isLoading) return;
    
    setErrors({});

    if (isEditing) {
      // Al editar, no enviar password si está vacío
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      };
      updateMutation.mutate({ id: user.id, data: updateData });
    } else {
      // Al crear, password es obligatorio
      if (!formData.password) {
        setErrors({ password: ['La contraseña es obligatoria'] });
        return;
      }
      if (formData.password !== formData.password_confirmation) {
        setErrors({ password_confirmation: ['Las contraseñas no coinciden'] });
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        // Cerrar solo si se hace clic en el overlay (no en el contenido)
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl p-6 bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100">
              <UserPlus className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <p className="text-sm text-gray-600">
                {isEditing ? 'Actualiza la información del usuario' : 'Completa los datos del nuevo usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-gray-400 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Nombre completo *
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Correo electrónico *
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              required
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
            )}
          </div>

          {/* Contraseña (solo al crear) */}
          {!isEditing && (
            <>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Contraseña *
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  required={!isEditing}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Confirmar contraseña *
                </label>
                <Input
                  type="password"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  placeholder="Repite la contraseña"
                  required={!isEditing}
                  disabled={isLoading}
                />
                {errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password_confirmation[0]}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Rol */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Rol *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isLoading}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role[0]}</p>
            )}
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
            <div>
              <label className="font-semibold text-gray-900">Usuario activo</label>
              <p className="text-sm text-gray-600">
                Los usuarios inactivos no podrán iniciar sesión
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex items-center justify-center flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Actualizar' : 'Crear Usuario'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
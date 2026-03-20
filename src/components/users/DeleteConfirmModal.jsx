import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../api/userService';
import { Button } from '../common/Button';
import { X, Trash2, AlertTriangle } from 'lucide-react';

export const DeleteConfirmModal = ({ isOpen, onClose, user }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
  });

  // ✅ CORREGIDO: Usar isPending
  const isLoading = mutation.isPending;

  const handleDelete = () => {
    // Prevenir múltiples clics
    if (isLoading) return;
    
    mutation.mutate(user.id);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Eliminar Usuario</h2>
              <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
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

        {/* Content */}
        <div className="mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-gray-700">
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <strong className="text-gray-900">{user?.name}</strong>?
            </p>
            <p className="mt-2 text-sm text-red-700">
              <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente el usuario y no podrá recuperarse.
            </p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <strong>Rol:</strong> {user?.roles[0]?.name}
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
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
            onClick={handleDelete}
            className="flex items-center justify-center flex-1 gap-2 bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar Usuario
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
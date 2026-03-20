import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { validationHistoryService } from '../../api/validationHistoryService';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  Calendar,
  History,
  AlertCircle,
  FileText
} from 'lucide-react';

export const ValidationHistoryModal = ({ documentId, onClose }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['validation-history', documentId],
    queryFn: () => validationHistoryService.getHistory(documentId),
    enabled: !!documentId,
  });

  const getStatusConfig = (status) => {
    const configs = {
      approved: {
        icon: CheckCircle,
        variant: 'active',
        label: 'Aprobado',
      },
      rejected: {
        icon: XCircle,
        variant: 'rejected',
        label: 'Rechazado',
      },
      pending: {
        icon: Clock,
        variant: 'pending',
        label: 'Pendiente',
      },
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(dateString);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Historial de Validaciones
            </h3>
            {data?.document && (
              <p className="text-xs text-gray-600 font-normal mt-0.5">
                {data.document.document_type} - {data.document.file_name}
              </p>
            )}
          </div>
        </div>
      }
      size="xl"
      footer={
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Cerrar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
            <p className="font-medium text-gray-600">Cargando historial...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-red-100 rounded-full">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="mb-2 font-bold text-gray-900">Error al cargar historial</p>
            <p className="text-sm text-gray-600">{error.message}</p>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <>
            {/* Info del documento */}
            {data.document && (
              <div className="p-5 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Proveedor
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {data.document.provider.business_name}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Estado Actual
                    </p>
                    <Badge variant={getStatusConfig(data.document.current_status).variant}>
                      {getStatusConfig(data.document.current_status).label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline de validaciones */}
            {data.validations && data.validations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">
                    Historial de Validaciones
                  </h3>
                  <span className="text-sm text-gray-600">
                    {data.total_validations} {data.total_validations === 1 ? 'validación' : 'validaciones'}
                  </span>
                </div>

                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  {/* Items del timeline */}
                  <div className="space-y-6">
                    {data.validations.map((validation, index) => {
                      const config = getStatusConfig(validation.status);
                      const StatusIcon = config.icon;

                      return (
                        <div key={validation.id} className="relative pl-20">
                          {/* Icono en el timeline */}
                          <div className={`
                            absolute left-5 flex items-center justify-center w-8 h-8 rounded-lg
                            ${validation.status === 'approved' ? 'bg-green-100' : validation.status === 'rejected' ? 'bg-red-100' : 'bg-accent-100'}
                            border-2
                            ${validation.status === 'approved' ? 'border-green-300' : validation.status === 'rejected' ? 'border-red-300' : 'border-accent-300'}
                            shadow-md
                          `}>
                            <StatusIcon className={`
                              w-4 h-4
                              ${validation.status === 'approved' ? 'text-green-600' : validation.status === 'rejected' ? 'text-red-600' : 'text-accent-600'}
                            `} />
                          </div>

                          {/* Tarjeta de validación */}
                          <div className={`
                            border-2 rounded-xl p-5 transition-all duration-200 hover:shadow-lg
                            ${validation.status === 'approved' 
                              ? 'border-green-300 bg-gradient-to-r from-green-50 to-green-50/50' 
                              : validation.status === 'rejected'
                              ? 'border-red-300 bg-gradient-to-r from-red-50 to-red-50/50'
                              : 'border-accent-300 bg-gradient-to-r from-accent-50 to-accent-50/50'
                            }
                          `}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Badge variant={config.variant}>
                                  {config.label}
                                </Badge>
                                {index === 0 && (
                                  <span className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">
                                    Más reciente
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-gray-500">
                                {getTimeAgo(validation.validated_at)}
                              </span>
                            </div>

                            {/* Información del validador */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-white border-2 border-gray-200 rounded-lg">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {validation.validated_by.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {validation.validated_by.email}
                                </p>
                              </div>
                            </div>

                            {/* Fecha completa */}
                            <div className="flex items-center gap-2 mb-4 text-xs text-gray-600">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="font-medium">{formatDate(validation.validated_at)}</span>
                            </div>

                            {/* Comentarios */}
                            {validation.comments && (
                              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="mb-1 text-xs font-semibold text-gray-700">
                                      Comentarios:
                                    </p>
                                    <p className="text-sm italic text-gray-800 whitespace-pre-wrap">
                                      "{validation.comments}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="mb-2 font-bold text-gray-900">Sin validaciones</p>
                <p className="text-sm text-gray-600">
                  Este documento aún no ha sido validado
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
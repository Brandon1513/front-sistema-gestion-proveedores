import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { 
  FileText, 
  Download, 
  Trash2, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const DocumentsList = ({ providerId }) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['provider-documents', providerId],
    queryFn: () => documentService.getByProvider(providerId),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId) => documentService.delete(providerId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-documents', providerId]);
      queryClient.invalidateQueries(['provider-required-documents', providerId]);
    },
  });

  const handleDownload = async (documentId, filename) => {
    try {
      const blob = await documentService.download(providerId, documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar:', error);
    }
  };

  const handleDelete = (documentId, filename) => {
    if (window.confirm(`¿Está seguro de eliminar el documento "${filename}"?`)) {
      deleteMutation.mutate(documentId);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        label: 'Pendiente', 
        variant: 'pending',
        icon: Clock 
      },
      approved: { 
        label: 'Aprobado', 
        variant: 'active',
        icon: CheckCircle 
      },
      rejected: { 
        label: 'Rechazado', 
        variant: 'rejected',
        icon: XCircle 
      },
      expired: { 
        label: 'Vencido', 
        variant: 'expired',
        icon: AlertTriangle 
      },
    };
    
    const config = statusConfig[status] || { 
      label: status, 
      variant: 'info',
      icon: FileText 
    };
    
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd/MMM/yyyy', { locale: es });
  };

  const formatFileSize = (kb) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getExpiryWarning = (expiryDate, status) => {
    if (!expiryDate || status !== 'approved') return null;
    
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry < 0) {
      return { type: 'expired', message: 'Documento vencido', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 30) {
      return { type: 'expiring', message: `Vence en ${daysUntilExpiry} días`, days: daysUntilExpiry };
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="default">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="w-12 h-12 mb-3 text-red-500" />
          <p className="text-sm font-medium text-red-600">Error al cargar documentos</p>
          <p className="mt-1 text-xs text-gray-500">Intenta recargar la página</p>
        </div>
      </Card>
    );
  }

  const documents = data?.documents || [];

  if (documents.length === 0) {
    return (
      <Card variant="default">
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-50">
            <FileText className="w-8 h-8 text-primary-500" />
          </div>
          <p className="font-medium text-gray-900">No hay documentos cargados</p>
          <p className="mt-1 text-sm text-gray-500">Los documentos subidos aparecerán aquí</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-3">
        {documents.map((doc) => {
          const expiryWarning = getExpiryWarning(doc.expiry_date, doc.status);
          
          return (
            <div 
              key={doc.id} 
              className={`
                relative p-5 rounded-xl border-2 transition-all duration-200
                hover:shadow-md
                ${expiryWarning?.type === 'expired' 
                  ? 'border-red-300 bg-gradient-to-r from-red-50 to-red-50/50' 
                  : expiryWarning?.type === 'expiring' 
                  ? 'border-accent-300 bg-gradient-to-r from-accent-50 to-accent-50/50'
                  : 'border-gray-200 bg-white hover:border-primary-200'
                }
              `}
            >
              {/* Version Badge (si es mayor a 1) */}
              {doc.version > 1 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="info" className="text-xs">
                    v{doc.version}
                  </Badge>
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Ícono del documento */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 shadow-md rounded-xl bg-gradient-primary">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  {/* Título y badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 text-base font-bold text-gray-900 truncate">
                        {doc.document_type?.name || 'Sin tipo'}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {doc.original_filename}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  
                  {/* Información del documento */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-primary-500" />
                      <span>Subido: {formatDate(doc.created_at)}</span>
                    </div>
                    
                    {doc.expiry_date && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-alert-500" />
                        <span>Vence: {formatDate(doc.expiry_date)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{formatFileSize(doc.file_size_kb)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{doc.uploaded_by?.name || 'Desconocido'}</span>
                    </div>
                  </div>
                  
                  {/* Alerta de vencimiento */}
                  {expiryWarning && (
                    <div className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-3
                      ${expiryWarning.type === 'expired' 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : 'bg-accent-100 text-accent-700 border border-accent-200'
                      }
                    `}>
                      <AlertTriangle className="flex-shrink-0 w-4 h-4" />
                      <span>{expiryWarning.message}</span>
                    </div>
                  )}
                  
                  {/* Notas */}
                  {doc.notes && (
                    <div className="px-3 py-2 mb-3 border rounded-lg bg-primary-50 border-primary-100">
                      <p className="text-xs text-primary-700">
                        <span className="font-semibold">Nota:</span> {doc.notes}
                      </p>
                    </div>
                  )}
                  
                  {/* Información de validación */}
                  {doc.validations && doc.validations.length > 0 && (
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                      <p className="mb-1 text-xs font-medium text-gray-700">
                        Última validación por: {doc.validations[0]?.validated_by?.name || 'N/A'}
                      </p>
                      {doc.validations[0]?.comments && (
                        <p className="text-xs italic text-gray-600">
                          "{doc.validations[0].comments}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Botones de acción */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownload(doc.id, doc.original_filename)}
                    className="p-2.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors shadow-sm"
                    title="Descargar"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(doc.id, doc.original_filename)}
                    className="p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                    title="Eliminar"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ValidationHistoryModal } from '../providers/ValidationHistoryModal';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar,
  Building2,
  User,
  AlertCircle,
  MessageSquare,
  Download,
  Eye,
  History
} from 'lucide-react';

export const ValidationModal = ({ isOpen, onClose, document }) => {
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Reset state cuando cambia el documento
  useEffect(() => {
    if (document) {
      setAction(null);
      setComments('');
      setError('');
    }
  }, [document]);

  const mutation = useMutation({
    mutationFn: ({ documentId, validationData }) => 
      documentService.validate(document.provider_id, documentId, validationData),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-documents']);
      queryClient.invalidateQueries(['provider-documents']);
      queryClient.invalidateQueries(['provider-required-documents']);
      handleClose();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al validar el documento');
    },
  });

  const handleSubmit = () => {
    if (!action) {
      setError('Debe seleccionar una acción (Aprobar o Rechazar)');
      return;
    }

    if (action === 'reject' && !comments.trim()) {
      setError('Debe proporcionar un motivo de rechazo');
      return;
    }

    const validationData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      comments: comments.trim() || null,
    };

    mutation.mutate({ 
      documentId: document.id, 
      validationData 
    });
  };

  const handleClose = () => {
    setAction(null);
    setComments('');
    setError('');
    onClose();
  };

  const handleView = () => {
    if (!document) {
      setError('No hay documento seleccionado');
      return;
    }

    const providerId = document.provider_id || document.provider?.id;
    const documentId = document.id;

    if (!providerId || !documentId) {
      setError('Error: IDs de documento no disponibles');
      return;
    }

    try {
      setViewing(true);
      setError('');
      const viewUrl = documentService.getViewUrl(providerId, documentId);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
      setViewing(false);
    } catch (error) {
      setViewing(false);
      setError('Error al abrir el documento');
    }
  };

  const handleDownload = async () => {
    if (!document) {
      setError('No hay documento seleccionado');
      return;
    }

    const providerId = document.provider_id || document.provider?.id;
    const documentId = document.id;

    if (!providerId || !documentId) {
      setError('Error: IDs de documento no disponibles');
      return;
    }

    try {
      setDownloading(true);
      setError('');
      await documentService.download(providerId, documentId);
      setDownloading(false);
    } catch (error) {
      setDownloading(false);
      setError(error.response?.data?.message || 'Error al descargar el documento');
    }
  };

  if (!document) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExpiryStatus = () => {
    const daysUntilExpiry = document.days_until_expiry;
    
    if (!daysUntilExpiry) return null;
    
    if (daysUntilExpiry <= 7) {
      return (
        <div className="flex items-start p-4 border-2 border-red-300 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 animate-fade-in">
          <AlertCircle className="flex-shrink-0 w-6 h-6 mr-3 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-900">⚠️ Documento Urgente</p>
            <p className="mt-1 text-sm text-red-700">Vence en {daysUntilExpiry} días</p>
          </div>
        </div>
      );
    }
    
    if (daysUntilExpiry <= 15) {
      return (
        <div className="flex items-start p-4 border-2 border-accent-300 rounded-xl bg-gradient-to-r from-accent-50 to-accent-50/50 animate-fade-in">
          <AlertCircle className="flex-shrink-0 w-6 h-6 mr-3 text-accent-600" />
          <div>
            <p className="text-sm font-bold text-accent-900">⚡ Atención Requerida</p>
            <p className="mt-1 text-sm text-accent-700">Vence en {daysUntilExpiry} días</p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const isPreviewable = () => {
    const extension = document.file_extension?.toLowerCase();
    const previewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    return previewableExtensions.includes(extension);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Validar Documento"
        size="xl"
      >
        <div className="space-y-6">
          {/* Alerta de vencimiento */}
          {getExpiryStatus()}

          {/* Información del Proveedor */}
          <div className="p-5 border-2 border-primary-200 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center flex-shrink-0 shadow-md w-14 h-14 rounded-xl bg-gradient-primary">
                <Building2 className="text-white w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {document.provider?.business_name || 'Proveedor sin nombre'}
                </h3>
                <div className="mt-2 space-y-1.5">
                  <p className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="font-semibold">RFC:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded">
                      {document.provider?.rfc || 'N/A'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Tipo:</span> {document.provider?.provider_type?.name || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Documento */}
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900">
                  {document.document_type?.name || 'Sin tipo'}
                </h4>
                <p className="mt-1 text-sm text-gray-600">{document.original_filename}</p>
                {document.version > 1 && (
                  <Badge variant="info" className="mt-2">
                    Versión {document.version}
                  </Badge>
                )}
              </div>
            </div>

            {/* Detalles en grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <InfoItem
                icon={Calendar}
                label="Fecha de Emisión"
                value={formatDate(document.issue_date)}
              />
              <InfoItem
                icon={Calendar}
                label="Fecha de Vencimiento"
                value={formatDate(document.expiry_date)}
              />
              <InfoItem
                icon={Calendar}
                label="Fecha de Carga"
                value={formatDate(document.created_at)}
              />
              <InfoItem
                icon={User}
                label="Subido por"
                value={document.uploaded_by?.name || 'N/A'}
              />
            </div>

            {/* Notas del proveedor */}
            {document.notes && (
              <div className="p-4 mt-4 border-l-4 rounded-r-xl bg-primary-50 border-primary-500">
                <p className="flex items-center mb-2 text-sm font-bold text-primary-900">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Notas del proveedor:
                </p>
                <p className="text-sm italic text-gray-700">{document.notes}</p>
              </div>
            )}
          </div>

          {/* Botón Ver Historial */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center justify-center w-full gap-2 px-5 py-3.5 text-sm font-semibold text-primary-700 transition-all border-2 border-primary-300 rounded-xl bg-primary-50 hover:bg-primary-100 hover:border-primary-400 hover:shadow-md"
          >
            <History className="w-5 h-5" />
            Ver Historial de Validaciones
          </button>

          {/* Acciones de visualización */}
          <div className="grid grid-cols-2 gap-3">
            {/* Botón VER */}
            {isPreviewable() ? (
              <Button
                variant="primary"
                onClick={handleView}
                disabled={viewing || downloading}
                leftIcon={<Eye className="w-4 h-4" />}
              >
                Ver Documento
              </Button>
            ) : (
              <div className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                <Eye className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <p className="text-xs font-medium text-center text-gray-500">
                  Vista previa no disponible
                </p>
              </div>
            )}

            {/* Botón DESCARGAR */}
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={downloading || viewing}
              loading={downloading}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {downloading ? 'Descargando...' : 'Descargar'}
            </Button>
          </div>

          {/* Info sobre el formato */}
          {!isPreviewable() && (
            <div className="flex items-start gap-3 p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Este documento es de formato <strong>{document.file_extension?.toUpperCase()}</strong>
                {' '}y debe ser descargado para visualizarse.
              </p>
            </div>
          )}

          {/* Sección de Validación */}
          <div className="pt-6 border-t-2 border-gray-200">
            <h4 className="mb-4 text-base font-bold text-gray-900">Decisión de Validación</h4>
            
            {/* Opciones de acción */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <button
                onClick={() => setAction('approve')}
                className={`
                  flex flex-col items-center justify-center p-5 border-2 rounded-xl transition-all duration-200 transform
                  ${action === 'approve'
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 scale-[1.02] shadow-md'
                    : 'border-gray-300 hover:border-green-300 hover:bg-green-50 hover:scale-[1.01]'
                  }
                `}
              >
                <CheckCircle className={`w-8 h-8 mb-2 ${action === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`font-bold text-base ${action === 'approve' ? 'text-green-700' : 'text-gray-700'}`}>
                  Aprobar
                </span>
                {action === 'approve' && (
                  <span className="mt-1 text-xs text-green-600">✓ Seleccionado</span>
                )}
              </button>

              <button
                onClick={() => setAction('reject')}
                className={`
                  flex flex-col items-center justify-center p-5 border-2 rounded-xl transition-all duration-200 transform
                  ${action === 'reject'
                    ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 scale-[1.02] shadow-md'
                    : 'border-gray-300 hover:border-red-300 hover:bg-red-50 hover:scale-[1.01]'
                  }
                `}
              >
                <XCircle className={`w-8 h-8 mb-2 ${action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`font-bold text-base ${action === 'reject' ? 'text-red-700' : 'text-gray-700'}`}>
                  Rechazar
                </span>
                {action === 'reject' && (
                  <span className="mt-1 text-xs text-red-600">✓ Seleccionado</span>
                )}
              </button>
            </div>

            {/* Campo de comentarios */}
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700">
                Comentarios {action === 'reject' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder={
                  action === 'reject' 
                    ? 'Explique el motivo del rechazo...' 
                    : 'Observaciones adicionales (opcional)...'
                }
                className={`
                  w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all resize-none
                  ${action === 'reject' && !comments.trim()
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary/20 focus:border-primary'
                  }
                `}
              />
              {action === 'reject' && !comments.trim() && (
                <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Es obligatorio proporcionar un motivo de rechazo
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-3 p-4 mt-4 border-2 border-red-200 rounded-xl bg-red-50 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              loading={mutation.isPending}
              disabled={!action || (action === 'reject' && !comments.trim())}
              variant={action === 'approve' ? 'success' : action === 'reject' ? 'danger' : 'primary'}
              leftIcon={action === 'approve' ? <CheckCircle className="w-4 h-4" /> : action === 'reject' ? <XCircle className="w-4 h-4" /> : null}
            >
              {action === 'approve' 
                ? 'Aprobar Documento'
                : action === 'reject' 
                ? 'Rechazar Documento'
                : 'Seleccione una acción'
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Historial */}
      {showHistory && (
        <ValidationHistoryModal
          documentId={document.id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
};

// Componente auxiliar para mostrar información
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="space-y-1">
    <p className="flex items-center text-xs font-semibold tracking-wide text-gray-600 uppercase">
      <Icon className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
      {label}
    </p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);
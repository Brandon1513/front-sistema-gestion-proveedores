import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { providerDocumentService } from '../../api/providerDocumentService';
import { showToast } from '../../utils/toast';
import {
  Calendar, CheckCircle, XCircle, Clock, User,
  MessageSquare, FileText, AlertCircle, Eye, Download,
} from 'lucide-react';

// Extensiones que el navegador puede previsualizar
const PREVIEWABLE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

const isPreviewable = (document) => {
  const ext = (document?.file_extension || document?.original_filename?.split('.').pop() || '').toLowerCase();
  return PREVIEWABLE_EXTENSIONS.includes(ext);
};

export const DocumentDetailModal = ({ document, onClose }) => {
  if (!document) return null;

  const getStatusVariant = (status) => (
    { approved: 'active', pending: 'pending', rejected: 'rejected' }[status] || 'pending'
  );

  const getStatusConfig = (status) => (
    {
      approved: { icon: CheckCircle, text: 'Aprobado'    },
      pending:  { icon: Clock,       text: 'En Revisión' },
      rejected: { icon: XCircle,     text: 'Rechazado'   },
    }[status] || { icon: Clock, text: 'En Revisión' }
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const handlePreview = () => {
    // El documento necesita provider_id — puede venir como campo directo o en la relación
    const providerId = document.provider_id || document.provider?.id;
    if (!providerId) {
      showToast.error('No se pudo obtener la información del proveedor');
      return;
    }
    const success = providerDocumentService.preview(providerId, document.id);
    if (!success) showToast.error('Error al abrir la vista previa. Por favor intenta de nuevo.');
  };

  const statusConfig  = getStatusConfig(document.status);
  const StatusIcon    = statusConfig.icon;
  const lastValidation = document.last_validation;
  const canPreview    = isPreviewable(document);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {document.document_type?.name || 'Documento'}
            </h3>
            <p className="text-xs text-gray-600 font-normal mt-0.5">Detalles del documento</p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {/* ✅ Botones de acción a la izquierda */}
          <div className="flex items-center gap-2">
            {/* Vista previa — solo para PDF e imágenes */}
            {canPreview ? (
              <Button
                variant="secondary"
                leftIcon={<Eye className="w-4 h-4" />}
                onClick={handlePreview}
              >
                Ver documento
              </Button>
            ) : (
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <FileText className="w-3.5 h-3.5" />
                Vista previa no disponible para este tipo de archivo
              </p>
            )}
          </div>

          {/* Cerrar a la derecha */}
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Estado */}
        <div className="p-5 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
          <label className="block mb-3 text-sm font-bold text-gray-900">Estado del Documento</label>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(document.status)} className="px-4 py-2 text-base">
              <StatusIcon className="w-5 h-5 mr-2" />
              {statusConfig.text}
            </Badge>
          </div>
        </div>

        {/* Info del archivo */}
        <div className="p-5 bg-white border-2 border-gray-200 rounded-xl">
          <h4 className="mb-4 text-sm font-bold text-gray-900">Información del Archivo</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem icon={FileText}  label="Nombre del Archivo" value={document.file_name || document.original_filename} />
            <InfoItem icon={FileText}  label="Tamaño"             value={`${document.file_size_kb} KB`} />
            <InfoItem icon={Calendar}  label="Fecha de Carga"     value={formatDate(document.uploaded_at || document.created_at)} />
            {document.expiry_date && (
              <InfoItem icon={Calendar} label="Fecha de Vencimiento" value={formatDate(document.expiry_date)} />
            )}
          </div>

          {/* ✅ Nota si no es previsualizable */}
          {!canPreview && (
            <div className="p-3 mt-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                Los archivos Word y Excel no pueden previsualizarse en el navegador. Usa el botón de descarga para verlos.
              </p>
            </div>
          )}
        </div>

        {/* Historial de validación */}
        {lastValidation && (
          <div className="space-y-4">
            <h4 className="flex items-center text-base font-bold text-gray-900">
              <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
              Última Validación
            </h4>
            <div className={`p-5 rounded-xl border-2 ${
              document.status === 'approved'
                ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-300'
                : 'bg-gradient-to-r from-red-50 to-red-50/50 border-red-300'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${document.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                    <User className={`w-5 h-5 ${document.status === 'approved' ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{lastValidation.validator?.name || 'Departamento de Calidad'}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(lastValidation.validated_at)}
                    </p>
                  </div>
                </div>
              </div>
              {lastValidation.comments && (
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <p className="flex items-center mb-2 text-sm font-semibold text-gray-700">
                    <MessageSquare className="w-4 h-4 mr-2" />Comentarios:
                  </p>
                  <p className="text-sm italic text-gray-900 whitespace-pre-wrap">"{lastValidation.comments}"</p>
                </div>
              )}
              {document.status === 'rejected' && (
                <div className="p-4 mt-4 bg-white border-2 border-red-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="mb-1 text-sm font-semibold text-red-900">Documento Rechazado</p>
                      <p className="text-sm text-red-700">Por favor, corrige los problemas mencionados y vuelve a cargarlo.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pendiente sin validación */}
        {document.status === 'pending' && !lastValidation && (
          <div className="p-5 border-2 border-accent-300 rounded-xl bg-gradient-to-r from-accent-50 to-accent-50/50">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-100">
                <Clock className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <p className="mb-1 font-bold text-accent-900">Documento en revisión</p>
                <p className="text-sm text-accent-700">
                  Tu documento está siendo revisado por el área de Calidad.
                  Recibirás una notificación cuando sea aprobado o rechazado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="space-y-1">
    <p className="flex items-center text-xs font-semibold tracking-wide text-gray-600 uppercase">
      <Icon className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
      {label}
    </p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);
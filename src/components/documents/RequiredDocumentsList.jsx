import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, TrendingUp, Star } from 'lucide-react';

export const RequiredDocumentsList = ({ providerId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['provider-required-documents', providerId],
    queryFn: () => documentService.getRequired(providerId),
  });

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
          <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
          <p className="text-sm font-medium text-red-600">Error al cargar documentos requeridos</p>
          <p className="mt-1 text-xs text-gray-500">Intenta recargar la página</p>
        </div>
      </Card>
    );
  }

  const allDocs       = data?.required_documents || [];
  const totalRequired = data?.total_required || 0;
  const totalUploaded = data?.total_uploaded || 0;
  const completion    = data?.completion_percentage || 0;

  // Separar obligatorios y opcionales
  const requiredDocs  = allDocs.filter(d => d.is_required);
  const optionalDocs  = allDocs.filter(d => !d.is_required);

  const optionalUploaded = optionalDocs.filter(d => d.uploaded).length;
  const optionalTotal    = optionalDocs.length;

  const getProgressColor = (percent) => {
    if (percent === 100) return 'bg-green-500';
    if (percent >= 70)   return 'bg-accent-500';
    if (percent >= 40)   return 'bg-alert-500';
    return 'bg-red-500';
  };
  const getProgressTextColor = (percent) => {
    if (percent === 100) return 'text-green-700';
    if (percent >= 70)   return 'text-accent-700';
    if (percent >= 40)   return 'text-alert-700';
    return 'text-red-700';
  };

  const requiredAllDone  = totalRequired > 0 && totalUploaded === totalRequired;
  const optionalAllDone  = optionalTotal > 0 && optionalUploaded === optionalTotal;

  const DocRow = ({ item }) => (
    <div
      className={`
        flex items-center justify-between p-4 rounded-xl 
        border-2 transition-all duration-200
        ${item.uploaded
          ? 'border-green-200 bg-gradient-to-r from-green-50 to-green-50/50 hover:shadow-md'
          : 'border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/30'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-lg shadow-sm
          ${item.uploaded ? 'bg-green-100' : 'bg-red-100'}
        `}>
          {item.uploaded
            ? <CheckCircle className="w-6 h-6 text-green-600" />
            : <XCircle className="w-6 h-6 text-red-600" />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {item.document_type?.name || 'Documento sin nombre'}
          </p>
          {item.uploaded && item.document && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-600">Versión actual: v{item.document.version}</p>
              {item.document.status === 'approved' && (
                <><span className="text-xs text-gray-400">•</span><span className="text-xs font-medium text-green-600">Aprobado</span></>
              )}
              {item.document.status === 'pending' && (
                <><span className="text-xs text-gray-400">•</span><span className="text-xs font-medium text-accent-600">En revisión</span></>
              )}
            </div>
          )}
          {!item.uploaded && (
            <p className="mt-1 text-xs font-medium text-red-600">Documento pendiente de carga</p>
          )}
        </div>
      </div>
      <Badge variant={item.uploaded ? 'active' : 'rejected'}>
        {item.uploaded ? 'Completo' : 'Pendiente'}
      </Badge>
    </div>
  );

  return (
    <Card
      title="Documentos Requeridos"
      subtitle="Seguimiento de la documentación obligatoria"
    >
      {/* ── Barra de progreso obligatorios ── */}
      <div className="p-5 mb-4 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-bold text-gray-900">Progreso de Documentación</span>
          </div>
          <span className={`text-2xl font-bold ${getProgressTextColor(completion)}`}>
            {completion}%
          </span>
        </div>
        <div className="relative w-full h-3 overflow-hidden bg-white rounded-full shadow-inner">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${getProgressColor(completion)}`}
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs font-medium text-gray-600">
            {totalUploaded} de {totalRequired} obligatorios completados
          </p>
          {requiredAllDone && (
            <div className="flex items-center gap-1 text-xs font-semibold text-green-700">
              <CheckCircle className="w-4 h-4" />
              ¡Obligatorios completos!
            </div>
          )}
        </div>
      </div>

      {/* ── Banner de estado combinado ── */}
      {requiredAllDone && optionalTotal > 0 && (
        <div className={`flex items-start gap-3 p-4 mb-4 rounded-xl border-2 ${
          optionalAllDone
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          {optionalAllDone
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <div className="text-sm">
            <p className={`font-semibold ${optionalAllDone ? 'text-green-800' : 'text-amber-800'}`}>
              {optionalAllDone
                ? 'Documentación completa al 100%'
                : `Faltan ${optionalTotal - optionalUploaded} documento${optionalTotal - optionalUploaded !== 1 ? 's' : ''} opcionales`
              }
            </p>
            <p className={`text-xs mt-0.5 ${optionalAllDone ? 'text-green-700' : 'text-amber-700'}`}>
              {optionalAllDone
                ? 'Todos los documentos, obligatorios y opcionales, están cargados.'
                : 'Los documentos opcionales no bloquean la activación, pero se recomienda completarlos.'
              }
            </p>
          </div>
        </div>
      )}

      {/* ── Lista obligatorios ── */}
      {requiredDocs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700">
              <XCircle className="w-3.5 h-3.5" />
              Obligatorios — {totalUploaded}/{totalRequired}
            </span>
          </div>
          <div className="space-y-3">
            {requiredDocs.map((item, index) => <DocRow key={index} item={item} />)}
          </div>
        </div>
      )}

      {/* ── Lista opcionales ── */}
      {optionalDocs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">
              <Star className="w-3.5 h-3.5" />
              Opcionales — {optionalUploaded}/{optionalTotal}
            </span>
          </div>
          <div className="space-y-3">
            {optionalDocs.map((item, index) => <DocRow key={index} item={item} />)}
          </div>
        </div>
      )}

      {/* ── Mensaje si nada requerido ── */}
      {allDocs.length === 0 && (
        <div className="py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700">No hay documentos requeridos</p>
          <p className="mt-1 text-sm text-gray-500">Este tipo de proveedor no tiene documentos configurados</p>
        </div>
      )}

      {/* ── Aviso documentación incompleta ── */}
      {completion < 100 && totalRequired > 0 && (
        <div className="p-4 mt-6 border rounded-xl bg-primary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-primary-900">Documentación incompleta</p>
              <p className="text-xs text-primary-700">
                Completa todos los documentos obligatorios para poder activar este proveedor.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
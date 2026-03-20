import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, TrendingUp } from 'lucide-react';

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

  const requiredDocs = data?.required_documents || [];
  const completion = data?.completion_percentage || 0;
  const totalUploaded = data?.total_uploaded || 0;
  const totalRequired = data?.total_required || 0;

  // Determinar el color del progreso según el porcentaje
  const getProgressColor = (percent) => {
    if (percent === 100) return 'bg-green-500';
    if (percent >= 70) return 'bg-accent-500';
    if (percent >= 40) return 'bg-alert-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percent) => {
    if (percent === 100) return 'text-green-700';
    if (percent >= 70) return 'text-accent-700';
    if (percent >= 40) return 'text-alert-700';
    return 'text-red-700';
  };

  return (
    <Card 
      title="Documentos Requeridos"
      subtitle="Seguimiento de la documentación obligatoria"
    >
      {/* Barra de progreso mejorada */}
      <div className="p-5 mb-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-bold text-gray-900">
              Progreso de Documentación
            </span>
          </div>
          <span className={`text-2xl font-bold ${getProgressTextColor(completion)}`}>
            {completion}%
          </span>
        </div>
        
        {/* Barra de progreso */}
        <div className="relative w-full h-3 overflow-hidden bg-white rounded-full shadow-inner">
          <div
            className={`
              h-full transition-all duration-500 ease-out rounded-full
              ${getProgressColor(completion)}
            `}
            style={{ width: `${completion}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs font-medium text-gray-600">
            {totalUploaded} de {totalRequired} documentos completados
          </p>
          {completion === 100 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-green-700">
              <CheckCircle className="w-4 h-4" />
              ¡Completo!
            </div>
          )}
        </div>
      </div>

      {/* Lista de documentos */}
      {requiredDocs.length === 0 ? (
        <div className="py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700">No hay documentos requeridos</p>
          <p className="mt-1 text-sm text-gray-500">
            Este tipo de proveedor no tiene documentos obligatorios
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requiredDocs.map((item, index) => (
            <div
              key={index}
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
                {/* Ícono de estado */}
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-lg shadow-sm
                  ${item.uploaded 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                  }
                `}>
                  {item.uploaded ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                
                {/* Información del documento */}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.document_type?.name || 'Documento sin nombre'}
                  </p>
                  {item.uploaded && item.document && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-600">
                        Versión actual: v{item.document.version}
                      </p>
                      {item.document.status && (
                        <span className="text-xs text-gray-400">•</span>
                      )}
                      {item.document.status === 'approved' && (
                        <span className="text-xs font-medium text-green-600">
                          Aprobado
                        </span>
                      )}
                      {item.document.status === 'pending' && (
                        <span className="text-xs font-medium text-accent-600">
                          En revisión
                        </span>
                      )}
                    </div>
                  )}
                  {!item.uploaded && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      Documento pendiente de carga
                    </p>
                  )}
                </div>
              </div>
              
              {/* Badge de estado */}
              <Badge variant={item.uploaded ? 'active' : 'rejected'}>
                {item.uploaded ? 'Completo' : 'Pendiente'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje de ayuda si no está completo */}
      {completion < 100 && totalRequired > 0 && (
        <div className="p-4 mt-6 border rounded-xl bg-primary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-primary-900">
                Documentación incompleta
              </p>
              <p className="text-xs text-primary-700">
                Completa todos los documentos requeridos para poder activar este proveedor.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
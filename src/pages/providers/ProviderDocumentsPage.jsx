import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { providerDashboardService } from '../../api/providerDashboardService';
import { providerDocumentService } from '../../api/providerDocumentService';
import { providerProfileService } from '../../api/providerProfileService';
import { DocumentDetailModal } from '../../components/providers/DocumentDetailModal';
import { ValidationHistoryModal } from '../../components/providers/ValidationHistoryModal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { showToast } from '../../utils/toast';
import toast from 'react-hot-toast';
import { canUploadDocument, getDaysLeft } from '../../utils/documentUploadRules';
import {
  FileText, CheckCircle, Clock, AlertTriangle, Download,
  Eye, Upload, Calendar, Search, Trash2, Loader2, History, Lock,
} from 'lucide-react';

export const ProviderDocumentsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const { data: requiredData, isLoading: loadingRequired } = useQuery({
    queryKey: ['provider-required-documents'],
    queryFn: providerDashboardService.getRequiredDocuments,
  });

  // ✅ provider_id para vista previa
  const { data: profileData } = useQuery({
    queryKey: ["provider-profile"],
    queryFn: providerProfileService.getProfile,
    staleTime: 5 * 60 * 1000,
  });
  const providerId = profileData?.provider?.id;

  const deleteMutation = useMutation({
    mutationFn: providerDocumentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-required-documents']);
      queryClient.invalidateQueries(['provider-documents']);
      queryClient.invalidateQueries(['provider-stats']);
      showToast.success('🗑️ Documento eliminado correctamente');
    },
    onError: (error) => {
      showToast.error(error.response?.data?.message || 'Error al eliminar documento');
    },
  });

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const handleDownload = async (documentId) => {
    setDownloadingId(documentId);
    try {
      await providerDocumentService.download(documentId);
      showToast.success('📄 Documento descargado correctamente');
      setTimeout(() => setDownloadingId(null), 1000);
    } catch {
      setDownloadingId(null);
      showToast.error('Error al descargar documento');
    }
  };

  const handleDelete = (doc) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">
          ¿Eliminar <span className="text-primary-600">"{doc.name}"</span>?
        </p>
        <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => {
            deleteMutation.mutate(doc.uploaded_document.id);
            toast.dismiss(t.id);
          }}>Eliminar</Button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' } });
  };

  const getStatusVariant = (status) => (
    { approved: 'active', pending: 'pending', rejected: 'rejected', not_uploaded: 'inactive' }[status] || 'inactive'
  );
  const getStatusText = (status) => (
    { approved: 'Aprobado', pending: 'En Revisión', rejected: 'Rechazado', not_uploaded: 'Sin Cargar' }[status] || status
  );
  const getUrgencyVariant = (daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return null;
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 7) return 'expired';
    if (daysLeft <= 15) return 'alert';
    if (daysLeft <= 30) return 'warning';
    return null;
  };
  const getUrgencyText = (daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return null;
    if (daysLeft < 0) return '🔴 Vencido';
    return `📅 ${daysLeft} días`;
  };

  const filteredDocuments = requiredData?.required_documents?.filter((doc) => {
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'uploaded' && !doc.uploaded) return false;
      if (filterStatus === 'not_uploaded' && doc.uploaded) return false;
      if (filterStatus === 'approved' && doc.uploaded_document?.status !== 'approved') return false;
      if (filterStatus === 'pending' && doc.uploaded_document?.status !== 'pending') return false;
      if (filterStatus === 'rejected' && doc.uploaded_document?.status !== 'rejected') return false;
    }
    return true;
  });

  const stats = {
    total:    requiredData?.required_documents?.length || 0,
    uploaded: requiredData?.required_documents?.filter(d => d.uploaded).length || 0,
    approved: requiredData?.required_documents?.filter(d => d.uploaded_document?.status === 'approved').length || 0,
    pending:  requiredData?.required_documents?.filter(d => d.uploaded_document?.status === 'pending').length || 0,
  };

  if (loadingRequired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <p className="text-gray-600">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
            <p className="text-sm text-gray-600">Gestiona y consulta el estado de todos tus documentos</p>
          </div>
        </div>
      </div>

      {/* Banner búsqueda activa */}
      {searchParams.get('search') && (
        <div className="flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-alert-50 border-alert-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="flex-shrink-0 w-4 h-4 text-alert-600" />
            <p className="text-sm font-medium text-alert-800">
              Mostrando resultado para: <span className="font-bold">"{searchParams.get('search')}"</span>
            </p>
          </div>
          <button
            onClick={() => { setSearchTerm(''); navigate('/provider/documents', { replace: true }); }}
            className="text-xs font-semibold underline text-alert-600 hover:text-alert-800"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Requeridos', value: stats.total,    color: 'gray',    Icon: FileText    },
          { label: 'Cargados',         value: stats.uploaded, color: 'primary', Icon: Upload      },
          { label: 'Aprobados',        value: stats.approved, color: 'green',   Icon: CheckCircle },
          { label: 'En Revisión',      value: stats.pending,  color: 'accent',  Icon: Clock       },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={`relative overflow-hidden p-6 rounded-xl bg-white border-2 border-${color}-200 hover:shadow-lg transition-all duration-200`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
                <p className={`mt-2 text-3xl font-bold text-${color}-600`}>{value}</p>
              </div>
              <div className={`p-3 rounded-lg shadow-md bg-gradient-to-br from-${color}-500 to-${color}-600`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-${color}-600`} />
          </div>
        ))}
      </div>

      {/* Tipo de Proveedor */}
      {requiredData?.provider_type && (
        <div className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-blue-900">Tipo de Proveedor: {requiredData.provider_type.name}</p>
              <p className="text-sm text-blue-700">Estos son los documentos requeridos para tu categoría</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Buscar documento"
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
        <div className="sm:w-64">
          <Select
            label="Filtrar por estado"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all',          label: 'Todos' },
              { value: 'uploaded',     label: 'Cargados' },
              { value: 'not_uploaded', label: 'Sin Cargar' },
              { value: 'approved',     label: 'Aprobados' },
              { value: 'pending',      label: 'En Revisión' },
              { value: 'rejected',     label: 'Rechazados' },
            ]}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <div className="p-6 space-y-3">
          {filteredDocuments && filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => {
              const status      = doc.uploaded ? doc.uploaded_document.status : 'not_uploaded';
              const daysLeft    = getDaysLeft(doc.uploaded_document?.expiry_date);
              const urgencyVar  = getUrgencyVariant(daysLeft);
              const isDownloading = downloadingId === doc.uploaded_document?.id;
              const isHighlighted = searchParams.get('search') &&
                doc.name.toLowerCase().includes(searchParams.get('search').toLowerCase());

              // ✅ Regla de bloqueo
              const { allowed: canUpload, reason: blockReason } = canUploadDocument(doc);

              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border-2 transition-all duration-200
                    ${isHighlighted ? 'border-alert-400 bg-alert-50 shadow-md' : 'border-gray-200 hover:bg-gray-50 hover:border-primary-200'}`}
                >
                  <div className="flex items-center justify-between p-4">
                    {/* Info */}
                    <div className="flex items-center flex-1 min-w-0 gap-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg shadow-md flex-shrink-0
                        ${isHighlighted ? 'bg-gradient-to-br from-alert-500 to-alert-600' : 'bg-gradient-primary'}`}>
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900 truncate">{doc.name}</p>
                          {doc.is_required && <Badge variant="expired">Requerido</Badge>}
                          {isHighlighted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-alert-100 text-alert-700 border border-alert-300">
                              <AlertTriangle className="w-3 h-3" />
                              Requiere renovación
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          {doc.uploaded && doc.uploaded_document ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Cargado: {formatDate(doc.uploaded_document.uploaded_at)}
                              </span>
                              {doc.uploaded_document.expiry_date && (
                                <span>Vence: {formatDate(doc.uploaded_document.expiry_date)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Sin cargar</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center flex-shrink-0 gap-2 ml-4">
                      {urgencyVar && <Badge variant={urgencyVar}>{getUrgencyText(daysLeft)}</Badge>}
                      <Badge variant={getStatusVariant(status)}>{getStatusText(status)}</Badge>

                      {doc.uploaded ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelectedDocumentId(doc.uploaded_document.id); setShowHistoryModal(true); }} className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Historial">
                            <History className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setSelectedDocument({ ...doc.uploaded_document, provider_id: providerId }); setShowDetailModal(true); }} className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Ver">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDownload(doc.uploaded_document.id)} disabled={isDownloading} className={`p-2 rounded-lg transition-colors ${isDownloading ? 'text-green-600 bg-green-50' : 'text-green-600 hover:bg-green-50'}`} title="Descargar">
                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                          </button>
                          {(status === 'pending' || status === 'rejected') && (
                            <button onClick={() => handleDelete(doc)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Eliminar">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}

                          {/* ✅ Botón renovar con bloqueo */}
                          {canUpload ? (
                            <button
                              onClick={() => navigate(`/provider/upload?document=${doc.id}`)}
                              className={`p-2 rounded-lg transition-colors ${isHighlighted ? 'text-white bg-alert-500 hover:bg-alert-600' : 'text-primary-600 hover:bg-primary-50'}`}
                              title="Renovar documento"
                            >
                              <Upload className="w-5 h-5" />
                            </button>
                          ) : (
                            <div className="relative group">
                              <button className="p-2 text-gray-300 rounded-lg cursor-not-allowed" title={blockReason} disabled>
                                <Lock className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant={isHighlighted ? 'danger' : 'primary'}
                          size="sm"
                          leftIcon={<Upload className="w-4 h-4" />}
                          onClick={() => navigate(`/provider/upload?document=${doc.id}`)}
                        >
                          Cargar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ✅ Leyenda de bloqueo debajo del item */}
                  {doc.uploaded && !canUpload && (
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-500">{blockReason}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-50">
                <FileText className="w-8 h-8 text-primary-500" />
              </div>
              <p className="font-medium text-gray-900">No se encontraron documentos</p>
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); navigate('/provider/documents', { replace: true }); }} className="mt-3 text-sm text-primary-600 hover:underline">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showDetailModal && (
        <DocumentDetailModal document={selectedDocument} onClose={() => { setShowDetailModal(false); setSelectedDocument(null); }} />
      )}
      {showHistoryModal && (
        <ValidationHistoryModal documentId={selectedDocumentId} onClose={() => { setShowHistoryModal(false); setSelectedDocumentId(null); }} />
      )}
    </div>
  );
};
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
  Eye, Upload, Calendar, Search, Trash2, Loader2, History,
  Lock, Tag, Layers, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusVariant = (status) =>
  ({ approved: 'active', pending: 'pending', rejected: 'rejected', not_uploaded: 'inactive' }[status] || 'inactive');

const getStatusText = (status) =>
  ({ approved: 'Aprobado', pending: 'En Revisión', rejected: 'Rechazado', not_uploaded: 'Sin Cargar' }[status] || status);

const getUrgencyVariant = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft < 0)   return 'expired';
  if (daysLeft <= 7)  return 'expired';
  if (daysLeft <= 15) return 'alert';
  if (daysLeft <= 30) return 'warning';
  return null;
};

const getUrgencyText = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft < 0) return '🔴 Vencido';
  return `📅 ${daysLeft} días`;
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-');
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

// ─── Subcomponente: fila de un documento individual ───────────────────────────
const DocumentRow = ({
  doc,
  isHighlighted,
  providerId,
  downloadingId,
  onDownload,
  onDelete,
  onViewHistory,
  onViewDetail,
  navigate,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Para allows_multiple el backend devuelve `documents` (array)
  // Para carga única devuelve `document` (objeto singular)
  const isMultiple   = doc.allows_multiple;
  const multiDocs    = doc.documents || [];           // array cuando allows_multiple
  const singleDoc    = doc.uploaded_document || null; // objeto cuando carga única

  // Estado general del tipo de documento
  const status = isMultiple
    ? (multiDocs.length > 0 ? 'uploaded' : 'not_uploaded')
    : (singleDoc ? singleDoc.status : 'not_uploaded');

  const daysLeft   = !isMultiple ? getDaysLeft(singleDoc?.expiry_date) : null;
  const urgencyVar = getUrgencyVariant(daysLeft);

  const { allowed: canUpload, reason: blockReason } = canUploadDocument(
    isMultiple ? { ...doc, uploaded: false } : doc
  );

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200
        ${isHighlighted
          ? 'border-alert-400 bg-alert-50 shadow-md'
          : 'border-gray-200 hover:bg-gray-50 hover:border-primary-200'}`}
    >
      {/* ── Fila principal ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1 min-w-0 gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg shadow-md flex-shrink-0
            ${isHighlighted ? 'bg-gradient-to-br from-alert-500 to-alert-600' : 'bg-gradient-primary'}`}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-gray-900 truncate">{doc.name}</p>
              {doc.is_required && <Badge variant="expired">Requerido</Badge>}
              {isMultiple && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <Layers className="w-3 h-3" />
                  {multiDocs.length} archivo{multiDocs.length !== 1 ? 's' : ''}
                </span>
              )}
              {isHighlighted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-alert-100 text-alert-700 border border-alert-300">
                  <AlertTriangle className="w-3 h-3" />
                  Requiere renovación
                </span>
              )}
            </div>

            {/* Resumen de estado */}
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {isMultiple ? (
                multiDocs.length > 0
                  ? <span className="text-gray-500">{multiDocs.length} producto(s) registrado(s)</span>
                  : <span className="text-gray-400">Sin archivos cargados</span>
              ) : (
                singleDoc ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Cargado: {formatDate(singleDoc.uploaded_at || singleDoc.created_at)}
                    </span>
                    {singleDoc.expiry_date && (
                      <span>Vence: {formatDate(singleDoc.expiry_date)}</span>
                    )}
                    {singleDoc.product_name && (
                      <span className="flex items-center gap-1 text-primary-600">
                        <Tag className="w-3 h-3" />
                        {singleDoc.product_name}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">Sin cargar</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center flex-shrink-0 gap-2 ml-4">
          {!isMultiple && urgencyVar && (
            <Badge variant={urgencyVar}>{getUrgencyText(daysLeft)}</Badge>
          )}

          {/* Badge de estado — para múltiples mostramos conteo */}
          {!isMultiple && (
            <Badge variant={getStatusVariant(status)}>{getStatusText(status)}</Badge>
          )}

          {/* Expandir lista — solo para allows_multiple */}
          {isMultiple && multiDocs.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Ocultar' : 'Ver archivos'}
            </button>
          )}

          {/* Acciones carga única */}
          {!isMultiple && singleDoc && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onViewHistory(singleDoc.id)}
                className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                title="Historial"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={() => onViewDetail({ ...singleDoc, provider_id: providerId })}
                className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                title="Ver"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDownload(singleDoc.id)}
                disabled={downloadingId === singleDoc.id}
                className="p-2 text-green-600 transition-colors rounded-lg hover:bg-green-50"
                title="Descargar"
              >
                {downloadingId === singleDoc.id
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Download className="w-5 h-5" />
                }
              </button>
              {(status === 'pending' || status === 'rejected') && (
                <button
                  onClick={() => onDelete(doc)}
                  className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Botón subir */}
          {isMultiple ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => navigate(`/provider/upload?document=${doc.id}`)}
            >
              Agregar
            </Button>
          ) : !singleDoc ? (
            <Button
              variant={isHighlighted ? 'danger' : 'primary'}
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => navigate(`/provider/upload?document=${doc.id}`)}
            >
              Cargar
            </Button>
          ) : canUpload ? (
            <button
              onClick={() => navigate(`/provider/upload?document=${doc.id}`)}
              className={`p-2 rounded-lg transition-colors ${
                isHighlighted
                  ? 'text-white bg-alert-500 hover:bg-alert-600'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
              title="Renovar documento"
            >
              <Upload className="w-5 h-5" />
            </button>
          ) : (
            <button
              className="p-2 text-gray-300 rounded-lg cursor-not-allowed"
              title={blockReason}
              disabled
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Leyenda de bloqueo */}
      {!isMultiple && singleDoc && !canUpload && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">{blockReason}</p>
        </div>
      )}

      {/* ── Lista expandible para allows_multiple ─────────────────────────── */}
      {isMultiple && expanded && multiDocs.length > 0 && (
        <div className="px-4 pt-3 pb-4 space-y-2 border-t border-gray-100">
          {multiDocs.map((mdoc) => {
            const mdaysLeft  = getDaysLeft(mdoc.expiry_date);
            const murgency   = getUrgencyVariant(mdaysLeft);
            const isDownloading = downloadingId === mdoc.id;

            return (
              <div
                key={mdoc.id}
                className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-white border border-gray-200 rounded-lg">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Nombre del producto si existe */}
                    {mdoc.product_name && (
                      <p className="flex items-center gap-1 text-sm font-semibold text-gray-800 truncate">
                        <Tag className="flex-shrink-0 w-3 h-3 text-primary-500" />
                        {mdoc.product_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate">{mdoc.original_filename}</p>
                    {mdoc.expiry_date && (
                      <p className="text-xs text-gray-400">Vence: {formatDate(mdoc.expiry_date)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center flex-shrink-0 gap-2 ml-3">
                  {murgency && (
                    <Badge variant={murgency}>{getUrgencyText(mdaysLeft)}</Badge>
                  )}
                  <Badge variant={getStatusVariant(mdoc.status)}>
                    {getStatusText(mdoc.status)}
                  </Badge>
                  <button
                    onClick={() => onViewHistory(mdoc.id)}
                    className="p-1.5 text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Historial"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewDetail({ ...mdoc, provider_id: providerId })}
                    className="p-1.5 text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Ver"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDownload(mdoc.id)}
                    disabled={isDownloading}
                    className="p-1.5 text-green-600 rounded-lg hover:bg-green-50"
                    title="Descargar"
                  >
                    {isDownloading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />
                    }
                  </button>
                  {(mdoc.status === 'pending' || mdoc.status === 'rejected') && (
                    <button
                      onClick={() => onDelete({ ...doc, uploaded_document: mdoc })}
                      className="p-1.5 text-red-600 rounded-lg hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProviderDocumentsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm]         = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailModal, setShowDetailModal]   = useState(false);
  const [downloadingId, setDownloadingId]       = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const { data: requiredData, isLoading: loadingRequired } = useQuery({
    queryKey: ['provider-required-documents'],
    queryFn: providerDashboardService.getRequiredDocuments,
  });

  const { data: profileData } = useQuery({
    queryKey: ['provider-profile'],
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
    ), {
      duration: Infinity,
      position: 'top-center',
      style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' },
    });
  };

  // ─── Separar obligatorios y recomendados ──────────────────────────────────
  const allDocs         = requiredData?.required_documents || [];
  const requiredDocs    = allDocs.filter(d => d.is_required);
  const recommendedDocs = allDocs.filter(d => !d.is_required);

  // Filtrar con búsqueda y estado
  const applyFilters = (docs) => docs.filter((doc) => {
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all') {
      const isMultiple = doc.allows_multiple;
      const uploaded   = isMultiple ? (doc.documents?.length > 0) : doc.uploaded;
      const status     = isMultiple ? null : doc.uploaded_document?.status;
      if (filterStatus === 'uploaded'     && !uploaded)              return false;
      if (filterStatus === 'not_uploaded' && uploaded)               return false;
      if (filterStatus === 'approved'     && status !== 'approved')  return false;
      if (filterStatus === 'pending'      && status !== 'pending')   return false;
      if (filterStatus === 'rejected'     && status !== 'rejected')  return false;
    }
    return true;
  });

  const filteredRequired    = applyFilters(requiredDocs);
  const filteredRecommended = applyFilters(recommendedDocs);

  // Stats (solo sobre obligatorios)
  const stats = {
    total:    requiredDocs.length,
    uploaded: requiredDocs.filter(d => d.allows_multiple ? d.documents?.length > 0 : d.uploaded).length,
    approved: requiredDocs.filter(d => !d.allows_multiple && d.uploaded_document?.status === 'approved').length,
    pending:  requiredDocs.filter(d => !d.allows_multiple && d.uploaded_document?.status === 'pending').length,
  };

  const rowProps = {
    providerId,
    downloadingId,
    onDownload:    handleDownload,
    onDelete:      handleDelete,
    onViewHistory: (id) => { setSelectedDocumentId(id); setShowHistoryModal(true); },
    onViewDetail:  (doc) => { setSelectedDocument(doc); setShowDetailModal(true); },
    navigate,
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

      {/* Tipo de proveedor */}
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

      {/* ── Sección: Documentación Obligatoria ─────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg">
            <FileText className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Documentación Obligatoria</h2>
            <p className="text-xs text-gray-500">Documentos requeridos para activar y mantener tu cuenta</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {filteredRequired.length > 0 ? (
            filteredRequired.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                isHighlighted={
                  !!searchParams.get('search') &&
                  doc.name.toLowerCase().includes(searchParams.get('search').toLowerCase())
                }
                {...rowProps}
              />
            ))
          ) : (
            <div className="py-10 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No se encontraron documentos obligatorios</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sección: Documentación Recomendada ─────────────────────────────── */}
      {(recommendedDocs.length > 0 || filteredRecommended.length > 0) && (
        <div className="bg-white border-2 shadow-sm border-amber-200 rounded-xl">
          <div className="flex items-start gap-3 px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg mt-0.5">
              <Info className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-amber-900">Documentación Recomendada</h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Aunque no es obligatoria, esta documentación es necesaria para el proceso de evaluación.
                Te recomendamos tenerla disponible.
              </p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {filteredRecommended.length > 0 ? (
              filteredRecommended.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  isHighlighted={false}
                  {...rowProps}
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No se encontraron documentos recomendados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showDetailModal && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={() => { setShowDetailModal(false); setSelectedDocument(null); }}
        />
      )}
      {showHistoryModal && (
        <ValidationHistoryModal
          documentId={selectedDocumentId}
          onClose={() => { setShowHistoryModal(false); setSelectedDocumentId(null); }}
        />
      )}
    </div>
  );
};
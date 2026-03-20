import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { documentService } from '../../api/documentService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ValidationModal } from '../../components/documents/ValidationModal';
import { ValidationHistoryModal } from '../../components/providers/ValidationHistoryModal';
import { showToast } from '../../utils/toast';
import {
  FileText, Clock, CheckCircle, XCircle, Eye, Download,
  Calendar, Building2, AlertCircle, Filter, Search, History, ClipboardCheck,
} from 'lucide-react';

export const DocumentValidationPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDocument, setSelectedDocument]       = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal]       = useState(false);
  const [selectedHistoryDocId, setSelectedHistoryDocId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    provider_type: '',
    document_type: '',
  });

  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['pending-documents', filters],
    queryFn: () => documentService.getPending(filters),
    refetchInterval: 30000,
  });

  const documents = documentsData?.documents || [];
  const stats     = documentsData?.stats || { total_pending: 0, urgent: 0, expiring_soon: 0 };

  // ✅ Si viene ?document=ID desde el dashboard, abrir ese documento en el modal
  useEffect(() => {
    const docId = searchParams.get('document');
    if (docId && documents.length > 0) {
      const doc = documents.find(d => String(d.id) === String(docId));
      if (doc) {
        setSelectedDocument(doc);
        setShowValidationModal(true);
        // Limpiar el param de la URL sin recargar
        setSearchParams({}, { replace: true });
      }
    }
  }, [documents, searchParams]);

  const handleValidate    = (document) => { setSelectedDocument(document); setShowValidationModal(true); };
  const handleShowHistory = (documentId) => { setSelectedHistoryDocId(documentId); setShowHistoryModal(true); };

  const handleDownload = async (document) => {
    try {
      await documentService.download(document.provider_id, document.id);
      showToast.success('📄 Documento descargado correctamente');
    } catch {
      showToast.error('Error al descargar documento');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', provider_type: '', document_type: '' });
    showToast.info('Filtros limpiados');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-6 text-center border-2 border-red-200 rounded-xl bg-red-50">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-red-900">Error al cargar documentos</p>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
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
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Validación de Documentos</h1>
            <p className="text-sm text-gray-600">Revisa y valida los documentos pendientes de los proveedores</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Pendientes',  value: stats.total_pending, color: 'accent', Icon: Clock        },
          { label: 'Urgentes',    value: stats.urgent,        color: 'red',    Icon: AlertCircle  },
          { label: 'Por Vencer',  value: stats.expiring_soon, color: 'alert',  Icon: Calendar     },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={`relative overflow-hidden p-6 rounded-xl bg-white border-2 border-${color}-200 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
                <p className={`mt-3 text-4xl font-bold text-${color}-600`}>{value}</p>
              </div>
              <div className={`bg-gradient-to-br from-${color}-500 to-${color}-600 p-3 rounded-lg shadow-md`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-${color}-600`} />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input label="Buscar" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Proveedor o RFC..." leftIcon={<Search className="w-4 h-4 text-gray-400" />} />
          <Select
            label="Tipo de Proveedor"
            name="provider_type"
            value={filters.provider_type}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Todos' },
              { value: '1', label: 'MP y ME' },
              { value: '2', label: 'Residuos' },
              { value: '3', label: 'Laboratorios' },
              { value: '4', label: 'Sustancias Químicas' },
              { value: '5', label: 'Insumos Generales' },
            ]}
          />
          <Input label="Tipo de Documento" name="document_type" value={filters.document_type} onChange={handleFilterChange} placeholder="Ej: Constancia fiscal..." />
          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} leftIcon={<Filter className="w-4 h-4" />} className="w-full">Limpiar</Button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <Card variant="elevated">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Documentos Pendientes</h2>
          </div>
          <Badge variant="pending">{documents.length}</Badge>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-green-100 to-green-200">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">¡Excelente trabajo!</p>
            <p className="mt-1 text-gray-600">No hay documentos pendientes de validación</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onValidate={handleValidate}
                onDownload={handleDownload}
                onShowHistory={handleShowHistory}
              />
            ))}
          </div>
        )}
      </Card>

      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => { setShowValidationModal(false); setSelectedDocument(null); }}
        document={selectedDocument}
      />

      {showHistoryModal && (
        <ValidationHistoryModal
          documentId={selectedHistoryDocId}
          onClose={() => { setShowHistoryModal(false); setSelectedHistoryDocId(null); }}
        />
      )}
    </div>
  );
};

// ─── Tarjeta de documento ─────────────────────────────────────────────────────
const DocumentCard = ({ document, onValidate, onDownload, onShowHistory }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getUrgencyBadge = () => {
    const d = document.days_until_expiry;
    if (!d || d > 30)  return null;
    if (d <= 7)  return <Badge variant="expired">🔥 Urgente — vence en {d} días</Badge>;
    if (d <= 15) return <Badge variant="alert">⚠️ Vence en {d} días</Badge>;
    return <Badge variant="warning">📅 Vence en {d} días</Badge>;
  };

  const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
    document.file_extension?.toLowerCase()
  );

  return (
    <div className="p-5 transition-all duration-200 bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-primary-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start flex-1 gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{document.provider?.business_name || 'Proveedor sin nombre'}</h3>
            <p className="text-sm text-gray-600">RFC: <span className="font-mono font-semibold">{document.provider?.rfc || 'N/A'}</span></p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getUrgencyBadge()}
          <Badge variant="pending">Pendiente</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
        <div className="p-3 border rounded-lg bg-primary-50 border-primary-200">
          <p className="flex items-center mb-1 text-xs font-semibold text-gray-600 uppercase"><FileText className="w-3.5 h-3.5 mr-1" />Tipo de Documento</p>
          <p className="text-sm font-bold text-gray-900 truncate">{document.document_type?.name || 'N/A'}</p>
        </div>
        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
          <p className="flex items-center mb-1 text-xs font-semibold text-gray-600 uppercase"><Calendar className="w-3.5 h-3.5 mr-1" />Fecha de Carga</p>
          <p className="text-sm font-bold text-gray-900">{formatDate(document.created_at)}</p>
        </div>
        <div className="p-3 border border-red-200 rounded-lg bg-red-50">
          <p className="flex items-center mb-1 text-xs font-semibold text-gray-600 uppercase"><AlertCircle className="w-3.5 h-3.5 mr-1" />Vencimiento</p>
          <p className="text-sm font-bold text-red-700">{formatDate(document.expiry_date)}</p>
        </div>
      </div>

      {document.notes && (
        <div className="p-4 mb-4 border-l-4 rounded-r-lg bg-blue-50 border-primary-500">
          <p className="mb-1 text-sm font-semibold text-gray-700">💬 Notas del proveedor:</p>
          <p className="text-sm text-gray-600">{document.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-4 border-t-2 border-gray-200">
        <Button variant="ghost" size="sm" onClick={() => onShowHistory(document.id)} leftIcon={<History className="w-4 h-4" />}>Historial</Button>
        <Button variant="secondary" size="sm" onClick={() => onDownload(document)} leftIcon={<Download className="w-4 h-4" />}>Descargar</Button>
        <Button variant="primary" size="sm" onClick={() => onValidate(document)} leftIcon={<Eye className="w-4 h-4" />}>Validar</Button>
      </div>
    </div>
  );
};
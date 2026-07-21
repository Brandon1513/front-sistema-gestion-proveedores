import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { canUploadDocument } from '../../utils/documentUploadRules';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import api from '../../api/axios';
import {
  Upload, FileText, X, AlertCircle, CheckCircle,
  Clock, Calendar, Lock, Info, Package, Wrench,
  FileBadge, Download, Layers, ChevronDown,
} from 'lucide-react';

// Códigos que requieren selector de producto (igual que portal proveedor)
const PRODUCT_SELECTOR_CODES = [
  'carta_garantia',
  'fichas_tecnicas',
  'fichas_tecnicas_insumos',
  'informacion_nutrimental',
  'carta_declaracion',
  'cartas_declaracion',
];

// Códigos que tienen template descargable
const TEMPLATE_DOC_CODES = ['carta_garantia', 'carta_no_trabajo_infantil'];

export const DocumentUploadModal = ({ isOpen, onClose, providerId, documentTypes }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    document_type_id: '',
    issue_date:       '',
    expiry_date:      '',
    notes:            '',
  });
  const [selectedProductId, setSelectedProductId] = useState('');
  const [file,       setFile]       = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error,      setError]      = useState('');

  const safeDocumentTypes = Array.isArray(documentTypes) ? documentTypes : [];

  // ── Estado actual de documentos (para bloqueo) ────────────────────────────
  const { data: requiredData } = useQuery({
    queryKey: ['provider-required-documents', providerId],
    queryFn: () => documentService.getRequired(providerId),
    enabled: isOpen && !!providerId,
  });

  // ── Productos del proveedor (para selector) ───────────────────────────────
  const { data: productsData } = useQuery({
    queryKey: ['provider-products-services', providerId],
    queryFn: async () => {
      const r = await api.get(`/providers/${providerId}/products-services`);
      return r.data;
    },
    enabled: isOpen && !!providerId,
    staleTime: 5 * 60 * 1000,
  });
  const allItems   = useMemo(() => [
    ...(productsData?.products || []),
    ...(productsData?.services || []),
  ], [productsData]);

  // Mapa: document_type_id → item requerido (para bloqueo)
  const uploadedMap = useMemo(() => {
    const allDocs = requiredData?.required_documents || [];
    const map = {};
    allDocs.forEach(item => {
      const typeId = item.document_type?.id;
      if (!typeId) return;
      map[typeId] = {
        uploaded:          item.uploaded,
        allows_multiple:   item.allows_multiple,
        uploaded_document: item.document
          ? { status: item.document.status, expiry_date: item.document.expiry_date }
          : null,
        // Para docs múltiples, qué productos ya están subidos
        documents: item.documents || [],
      };
    });
    return map;
  }, [requiredData]);

  // ── Tipo seleccionado ─────────────────────────────────────────────────────
  const selectedDocType = useMemo(() =>
    safeDocumentTypes.find(t => String(t.id) === String(formData.document_type_id)) || null,
    [safeDocumentTypes, formData.document_type_id]
  );

  const usesProductSelector = !!(
    selectedDocType?.code &&
    PRODUCT_SELECTOR_CODES.includes(selectedDocType.code) &&
    selectedDocType?.allows_multiple
  );

  const isSingleFormatDoc = !!(
    selectedDocType?.code &&
    TEMPLATE_DOC_CODES.includes(selectedDocType.code) &&
    !PRODUCT_SELECTOR_CODES.includes(selectedDocType.code)
  );

  const hasTemplate = !!(selectedDocType?.code && TEMPLATE_DOC_CODES.includes(selectedDocType.code));

  // ── Bloqueo con canUploadDocument ─────────────────────────────────────────
  const { allowed: canUpload, reason: blockReason } = useMemo(() => {
    if (!selectedDocType) return { allowed: false, reason: null };
    if (selectedDocType.allows_multiple) return { allowed: true, reason: null };
    const mapped = uploadedMap[selectedDocType.id];
    return canUploadDocument(mapped || { uploaded: false, uploaded_document: null });
  }, [selectedDocType, uploadedMap]);

  // ── Productos ya subidos para este doc (múltiples) ────────────────────────
  const alreadyUploadedProducts = useMemo(() => {
    if (!selectedDocType?.allows_multiple) return new Set();
    const mapped = uploadedMap[selectedDocType.id];
    const docs   = mapped?.documents || [];
    return new Set(
      docs
        .filter(d => ['pending', 'approved'].includes(d.status) && d.product_name)
        .map(d => d.product_name.toLowerCase().trim())
    );
  }, [selectedDocType, uploadedMap]);

  const selectedProductName = useMemo(() => {
    if (!usesProductSelector || !selectedProductId) return '';
    return allItems.find(p => String(p.id) === String(selectedProductId))?.name || '';
  }, [usesProductSelector, selectedProductId, allItems]);

  const selectedProductAlreadyUploaded = useMemo(() => {
    if (!usesProductSelector || !selectedProductId) return false;
    return alreadyUploadedProducts.has(selectedProductName.toLowerCase().trim());
  }, [usesProductSelector, selectedProductId, selectedProductName, alreadyUploadedProducts]);

  // ── Template ──────────────────────────────────────────────────────────────
  const { data: templateData } = useQuery({
    queryKey: ['document-template', selectedDocType?.id, selectedProductName],
    queryFn: () => api.get('/document-templates/by-product', {
      params: { document_type_id: selectedDocType?.id, product_name: selectedProductName }
    }).then(r => r.data),
    enabled: hasTemplate && !isSingleFormatDoc && !!selectedDocType?.id && !!selectedProductName,
    staleTime: 5 * 60 * 1000,
  });

  const { data: singleTemplateData } = useQuery({
    queryKey: ['document-template-single', selectedDocType?.id],
    queryFn: () => api.get('/document-templates/by-product', {
      params: { document_type_id: selectedDocType?.id, product_name: 'general' }
    }).then(r => r.data),
    enabled: isSingleFormatDoc && !!selectedDocType?.id && canUpload,
    staleTime: 5 * 60 * 1000,
  });

  const template       = templateData?.template || null;
  const singleTemplate = singleTemplateData?.template || null;

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const handleDownloadTemplate = async (tmpl) => {
    if (!tmpl) return;
    setDownloadingTemplate(true);
    try {
      const response = await api.get(`/document-templates/${tmpl.id}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', tmpl.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { setError('Error al descargar el formato'); }
    finally { setDownloadingTemplate(false); }
  };

  // ── Cálculo de vencimiento ────────────────────────────────────────────────
  const hasAutoExpiry  = !!(selectedDocType?.requires_expiry && selectedDocType?.expiry_months);
  const requiresExpiry = !!selectedDocType?.requires_expiry;

  const calculatedExpiryDisplay = useMemo(() => {
    if (!hasAutoExpiry || !formData.issue_date) return null;
    const d = new Date(formData.issue_date + 'T12:00:00');
    d.setMonth(d.getMonth() + selectedDocType.expiry_months);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [hasAutoExpiry, formData.issue_date, selectedDocType]);

  const calculatedExpiryValue = useMemo(() => {
    if (!hasAutoExpiry || !formData.issue_date) return null;
    const d = new Date(formData.issue_date + 'T12:00:00');
    d.setMonth(d.getMonth() + selectedDocType.expiry_months);
    return d.toLocaleDateString('en-CA');
  }, [hasAutoExpiry, formData.issue_date, selectedDocType]);

  // ── Separar obligatorios y opcionales para el select ─────────────────────
  const requiredDocs  = safeDocumentTypes.filter(t => t.pivot?.is_required);
  const optionalDocs  = safeDocumentTypes.filter(t => !t.pivot?.is_required);

  const isDocBlocked = (type) => {
    if (type.allows_multiple) return false;
    const mapped = uploadedMap[type.id];
    return !canUploadDocument(mapped || { uploaded: false, uploaded_document: null }).allowed;
  };

  const optionLabel = (type) => {
    const blocked = isDocBlocked(type);
    const suffix  = type.allows_multiple ? ' (múltiples)' : '';
    const lock    = blocked ? ' 🔒' : (uploadedMap[type.id]?.uploaded ? ' ✓' : '');
    return `${type.name}${suffix}${lock}`;
  };

  // ── Mutación ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => documentService.upload(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-documents', providerId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['provider-required-documents', providerId], exact: false });
      handleClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al subir el documento'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };
  const handleFile = (f) => {
    if (f.size > 10 * 1024 * 1024) { setError('El archivo no debe superar los 10MB'); return; }
    const allowed = [
      'application/pdf','image/jpeg','image/png','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowed.includes(f.type)) { setError('Solo se permiten archivos PDF, imágenes, Word y Excel'); return; }
    setFile(f); setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'document_type_id') {
      setFormData({ document_type_id: value, issue_date: '', expiry_date: '', notes: '' });
      setSelectedProductId('');
      setFile(null); setError('');
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.document_type_id)  { setError('Debe seleccionar el tipo de documento'); return; }
    if (!canUpload)                   { setError(blockReason || 'No se puede subir este documento'); return; }
    if (usesProductSelector && !selectedProductId) { setError('Selecciona el producto al que corresponde este documento'); return; }
    if (usesProductSelector && selectedProductAlreadyUploaded) { setError('Este producto ya tiene un documento en revisión o aprobado'); return; }
    if (!file)                        { setError('Debe seleccionar un archivo'); return; }
    if (hasAutoExpiry && !formData.issue_date) { setError('La fecha de emisión es requerida para este documento'); return; }

    const data = new FormData();
    data.append('file', file);
    data.append('document_type_id', formData.document_type_id);
    if (selectedProductName) data.append('product_name', selectedProductName);
    if (formData.issue_date) data.append('issue_date', formData.issue_date);
    if (hasAutoExpiry && calculatedExpiryValue) {
      data.append('expiry_date', calculatedExpiryValue);
    } else if (formData.expiry_date) {
      data.append('expiry_date', formData.expiry_date);
    }
    if (formData.notes) data.append('notes', formData.notes);
    mutation.mutate(data);
  };

  const handleClose = () => {
    setFormData({ document_type_id: '', issue_date: '', expiry_date: '', notes: '' });
    setSelectedProductId('');
    setFile(null); setError(''); onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ── TemplateBox (igual que portal proveedor) ──────────────────────────────
  const TemplateBox = ({ tmpl, productLabel }) => (
    <div className={`p-4 border-2 rounded-xl transition-all ${tmpl ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg shadow-sm ${tmpl ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-200'}`}>
          <FileBadge className={`w-5 h-5 ${tmpl ? 'text-white' : 'text-gray-400'}`}/>
        </div>
        <div className="flex-1">
          {tmpl ? (
            <>
              <p className="text-sm font-bold text-emerald-900">Este documento requiere seguir un formato específico</p>
              <p className="mt-1 text-xs text-emerald-700">
                {productLabel
                  ? <>Para <span className="font-semibold">{productLabel}</span> descarga el formato <span className="font-semibold">"{tmpl.template_name}"</span>, complétalo y súbelo aquí.</>
                  : 'Descarga el formato, complétalo con la información solicitada y súbelo aquí.'
                }
              </p>
              <button type="button" onClick={() => handleDownloadTemplate(tmpl)} disabled={downloadingTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-semibold text-white transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60">
                <Download className="w-4 h-4"/>
                {downloadingTemplate ? 'Descargando...' : `Descargar: ${tmpl.filename}`}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-600">Formato del documento</p>
              <p className="mt-1 text-xs text-gray-400">
                {productLabel
                  ? <>No hay formato específico para <span className="font-medium">{productLabel}</span>. Contacta a Calidad.</>
                  : 'No hay un formato cargado aún.'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Subir Documento" size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={mutation.isPending}
            disabled={!formData.document_type_id || !canUpload || safeDocumentTypes.length === 0}
            onClick={handleSubmit}>
            Subir Documento
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Select tipo de documento ── */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-900">
            <FileText className="w-4 h-4 text-primary-600"/>
            Tipo de Documento <span className="text-red-500">*</span>
          </label>
          <select name="document_type_id" value={formData.document_type_id} onChange={handleChange} required
            className="w-full px-3 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="">Selecciona un documento...</option>
            {requiredDocs.length > 0 && (
              <optgroup label="── Documentación Obligatoria ──">
                {requiredDocs.map(t => <option key={t.id} value={t.id}>{optionLabel(t)}</option>)}
              </optgroup>
            )}
            {optionalDocs.length > 0 && (
              <optgroup label="── Documentación Opcional ──">
                {optionalDocs.map(t => <option key={t.id} value={t.id}>{optionLabel(t)}</option>)}
              </optgroup>
            )}
            {requiredDocs.length === 0 && optionalDocs.length === 0 &&
              safeDocumentTypes.map(t => <option key={t.id} value={t.id}>{optionLabel(t)}</option>)
            }
          </select>

          {/* Info / bloqueo debajo del select */}
          {selectedDocType && (
            <div className="mt-3">
              {!canUpload ? (
                <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 bg-gray-200 rounded-lg">
                    <Lock className="w-4 h-4 text-gray-500"/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Carga no disponible</p>
                    <p className="mt-1 text-sm text-gray-500">{blockReason}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg shadow-md">
                    <Info className="w-4 h-4 text-white"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">
                      {selectedDocType.description || 'Sin descripción adicional'}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {selectedDocType.requires_expiry && (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                          <AlertCircle className="w-3.5 h-3.5"/>
                          {hasAutoExpiry
                            ? `Vence automáticamente a los ${selectedDocType.expiry_months} ${selectedDocType.expiry_months === 1 ? 'mes' : 'meses'}`
                            : 'Requiere fecha de vencimiento'}
                        </span>
                      )}
                      {selectedDocType.allows_multiple && (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                          <Layers className="w-3.5 h-3.5"/>Sube uno por cada producto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Template para doc SIN producto (carta no trabajo infantil) ── */}
        {isSingleFormatDoc && canUpload && (
          <TemplateBox tmpl={singleTemplate} productLabel={null}/>
        )}

        {/* ── Selector de producto ── */}
        {usesProductSelector && canUpload && (
          <div className="p-5 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <label className="flex items-center gap-2 mb-1 text-sm font-bold text-gray-900">
              <Package className="w-4 h-4 text-primary-600"/>
              Producto <span className="text-red-500">*</span>
            </label>
            <p className="mb-3 text-xs text-gray-500">Selecciona el producto. Debes subir un archivo por cada producto.</p>
            {allItems.length === 0 ? (
              <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Este proveedor no tiene productos registrados</p>
                    <p className="mt-1 text-xs text-amber-700">Ve a la pestaña de información general y agrega productos al catálogo del proveedor.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Package className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2"/>
                  <select value={selectedProductId} onChange={e => { setSelectedProductId(e.target.value); setError(''); }}
                    required
                    className="w-full py-3 pl-10 pr-10 text-sm bg-white border-2 border-gray-300 appearance-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">Selecciona un producto...</option>
                    {(productsData?.products || []).length > 0 && (
                      <optgroup label="── Productos ──">
                        {(productsData?.products || []).map(p => {
                          const already = alreadyUploadedProducts.has(p.name.toLowerCase().trim());
                          return (
                            <option key={p.id} value={p.id} disabled={already}>
                              {p.name}{already ? ' 🔒 (ya subido)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {(productsData?.services || []).length > 0 && (
                      <optgroup label="── Servicios ──">
                        {(productsData?.services || []).map(p => {
                          const already = alreadyUploadedProducts.has(p.name.toLowerCase().trim());
                          return (
                            <option key={p.id} value={p.id} disabled={already}>
                              {p.name}{already ? ' 🔒 (ya subido)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2"/>
                </div>

                {selectedProductAlreadyUploaded && (
                  <div className="flex items-start gap-3 p-3 mt-3 border-2 border-amber-200 rounded-xl bg-amber-50">
                    <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Este producto ya tiene un documento cargado</p>
                      <p className="text-xs text-amber-700 mt-0.5">Estado: En revisión o aprobado. No se puede subir otro hasta que sea rechazado o venza.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Template para doc CON producto (carta garantía) ── */}
        {hasTemplate && !isSingleFormatDoc && selectedProductName && canUpload && !selectedProductAlreadyUploaded && (
          <TemplateBox tmpl={template} productLabel={selectedProductName}/>
        )}

        {/* ── Drag & drop ── */}
        {canUpload && (
          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
              selectedProductAlreadyUploaded ? 'opacity-50 pointer-events-none bg-gray-50' :
              dragActive    ? 'border-primary bg-primary-50 scale-[1.02]' :
              file          ? 'border-green-400 bg-green-50' :
              !formData.document_type_id ? 'opacity-50 pointer-events-none border-gray-200 bg-gray-50' :
              'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag} onDragLeave={handleDrag}
            onDragOver={handleDrag}  onDrop={handleDrop}
          >
            <input type="file" onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              disabled={!formData.document_type_id || selectedProductAlreadyUploaded}
            />
            {!file ? (
              <div className="animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-100">
                  <Upload className="w-8 h-8 text-primary-600"/>
                </div>
                <p className="mb-2 text-base font-medium text-gray-700">Arrastra y suelta tu archivo aquí</p>
                <p className="mb-3 text-sm text-gray-500">o haz clic para seleccionar</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-primary-700 bg-primary-50">
                  <FileText className="w-4 h-4"/>PDF, Imagen, Word, Excel (Máx. 10MB)
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-white border-2 border-green-400 rounded-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600"/>
                  </div>
                  <div className="text-left">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {file.name}<CheckCircle className="w-4 h-4 text-green-600"/>
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)}
                  className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* ── Fechas ── */}
        {selectedDocType?.requires_expiry && canUpload && !selectedProductAlreadyUploaded && (
          <div className="p-5 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-900">
              <Calendar className="w-4 h-4 text-primary-600"/>Fechas del Documento
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={<span>Fecha de Emisión{hasAutoExpiry && <span className="text-red-500"> *</span>}</span>}
                type="date" name="issue_date" value={formData.issue_date} onChange={handleChange}
                max={new Date().toISOString().split('T')[0]} required={hasAutoExpiry}
              />
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Fecha de Vencimiento{!hasAutoExpiry && <span className="text-red-500"> *</span>}
                </label>
                {hasAutoExpiry ? (
                  <div className={`w-full min-h-[46px] py-3 px-4 rounded-xl border-2 flex items-center transition-all ${calculatedExpiryDisplay ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                    {calculatedExpiryDisplay ? (
                      <div>
                        <p className="text-sm font-bold capitalize text-amber-800">{calculatedExpiryDisplay}</p>
                        <p className="flex items-center gap-1 mt-0.5 text-xs text-amber-600">
                          <Clock className="w-3 h-3"/>
                          Calculado · {selectedDocType.expiry_months} {selectedDocType.expiry_months === 1 ? 'mes' : 'meses'} desde la emisión
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Ingresa la fecha de emisión para ver el vencimiento</p>
                    )}
                  </div>
                ) : (
                  <Input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange}
                    min={formData.issue_date || new Date().toISOString().split('T')[0]} required/>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fechas sin requires_expiry */}
        {selectedDocType && !selectedDocType.requires_expiry && canUpload && !selectedProductAlreadyUploaded && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Fecha de Emisión" type="date" name="issue_date" value={formData.issue_date} onChange={handleChange}/>
            <Input label="Fecha de Vencimiento" type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange}/>
          </div>
        )}

        {/* ── Notas ── */}
        {canUpload && !selectedProductAlreadyUploaded && (
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Notas</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
              className="w-full px-4 py-3 transition-all duration-200 border-2 border-gray-300 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Observaciones adicionales sobre el documento..."/>
          </div>
        )}

      </form>
    </Modal>
  );
};
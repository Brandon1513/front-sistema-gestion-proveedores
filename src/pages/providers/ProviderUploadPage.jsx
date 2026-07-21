import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { providerDashboardService } from '../../api/providerDashboardService';
import { providerDocumentService } from '../../api/providerDocumentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import { canUploadDocument } from '../../utils/documentUploadRules';
import api from '../../api/axios';
import {
  Upload, FileText, X, CheckCircle, AlertCircle,
  Calendar, File, Info, Lock, Layers, Clock,
  Package, ChevronDown, Download, FileBadge,
} from 'lucide-react';

// Documentos que usan selector de productos
const PRODUCT_SELECTOR_CODES = [
  'carta_garantia',
  'fichas_tecnicas',
  'fichas_tecnicas_insumos',
  'informacion_nutrimental',
  'carta_declaracion',
  'cartas_declaracion',
];

// Documentos que tienen templates de formato descargable
const TEMPLATE_DOC_CODES = ['carta_garantia', 'carta_no_trabajo_infantil'];

export const ProviderUploadPage = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('document');

  const [selectedDocType, setSelectedDocType]         = useState(preselectedDocId || '');
  const [selectedFile, setSelectedFile]               = useState(null);
  const [selectedProductId, setSelectedProductId]     = useState('');
  const [issueDate, setIssueDate]                     = useState('');
  const [expiryDate, setExpiryDate]                   = useState('');
  const [dragActive, setDragActive]                   = useState(false);
  const [uploadError, setUploadError]                 = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const { data: requiredData, isLoading } = useQuery({
    queryKey: ['provider-required-documents'],
    queryFn: providerDashboardService.getRequiredDocuments,
  });

  const { data: productsData } = useQuery({
    queryKey: ['provider-my-products'],
    queryFn: () => api.get('/provider/products-services-my').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const myProducts = productsData?.products || [];
  const myServices = productsData?.services || [];
  const allMyItems = productsData?.all      || [];

  // ─── Datos derivados ──────────────────────────────────────────────────────
  const allDocuments    = requiredData?.required_documents || [];
  const requiredDocs    = allDocuments.filter(d => d.is_required);
  const recommendedDocs = allDocuments.filter(d => !d.is_required);

  const selectedDocInfo = selectedDocType
    ? allDocuments.find(d => d.id === parseInt(selectedDocType))
    : null;

  const { allowed: canUpload, reason: blockReason } = canUploadDocument(selectedDocInfo);

  // ¿Usa selector de productos?
  const usesProductSelector = !!(
    selectedDocInfo?.code &&
    PRODUCT_SELECTOR_CODES.includes(selectedDocInfo.code) &&
    selectedDocInfo?.allows_multiple
  );

  // ¿Tiene template de formato?
  const hasTemplate = !!(selectedDocInfo?.code && TEMPLATE_DOC_CODES.includes(selectedDocInfo.code));

  // ✅ ¿Es documento de formato único (sin selector de productos)?
  const isSingleFormatDoc = !!(
    selectedDocInfo?.code &&
    TEMPLATE_DOC_CODES.includes(selectedDocInfo.code) &&
    !PRODUCT_SELECTOR_CODES.includes(selectedDocInfo.code)
  );

  // Nombre del producto seleccionado
  const selectedProductName = useMemo(() => {
    if (!usesProductSelector || !selectedProductId) return '';
    return allMyItems.find(p => String(p.id) === String(selectedProductId))?.name || '';
  }, [usesProductSelector, selectedProductId, allMyItems]);

  // ✅ Template para documentos CON selector de producto (Carta Garantía)
  const { data: templateData } = useQuery({
    queryKey: ['document-template', selectedDocInfo?.id, selectedProductName],
    queryFn: () => api.get('/document-templates/by-product', {
      params: { document_type_id: selectedDocInfo?.id, product_name: selectedProductName }
    }).then(r => r.data),
    enabled: hasTemplate && !isSingleFormatDoc && !!selectedDocInfo?.id && !!selectedProductName,
    staleTime: 5 * 60 * 1000,
  });
  const template = templateData?.template || null;

  // ✅ Template para documentos SIN selector de producto (Carta No Trabajo Infantil)
  const { data: singleTemplateData } = useQuery({
    queryKey: ['document-template-single', selectedDocInfo?.id],
    queryFn: () => api.get('/document-templates/by-product', {
      params: { document_type_id: selectedDocInfo?.id, product_name: 'general' }
    }).then(r => r.data),
    enabled: isSingleFormatDoc && !!selectedDocInfo?.id && canUpload,
    staleTime: 5 * 60 * 1000,
  });
  const singleTemplate = singleTemplateData?.template || null;

  const alreadyUploadedProducts = useMemo(() => {
    if (!selectedDocInfo?.documents) return new Set();
    return new Set(
      selectedDocInfo.documents
        .filter(d => ['pending', 'approved'].includes(d.status) && d.product_name)
        .map(d => d.product_name.toLowerCase().trim())
    );
  }, [selectedDocInfo]);

  const productsWithStatus = useMemo(() => {
    return allMyItems.map(item => {
      const alreadyUploaded = alreadyUploadedProducts.has(item.name.toLowerCase().trim());
      const uploadedDoc = selectedDocInfo?.documents?.find(
        d => d.product_name?.toLowerCase().trim() === item.name.toLowerCase().trim()
          && ['pending', 'approved'].includes(d.status)
      );
      return { ...item, alreadyUploaded, uploadedDoc };
    });
  }, [allMyItems, alreadyUploadedProducts, selectedDocInfo]);

  const finalProductName = useMemo(() => {
    if (usesProductSelector && selectedProductId)
      return allMyItems.find(p => String(p.id) === String(selectedProductId))?.name || '';
    return '';
  }, [usesProductSelector, selectedProductId, allMyItems]);

  const selectedProductAlreadyUploaded = useMemo(() => {
    if (!usesProductSelector || !selectedProductId) return false;
    return productsWithStatus.find(p => String(p.id) === String(selectedProductId))?.alreadyUploaded || false;
  }, [usesProductSelector, selectedProductId, productsWithStatus]);

  const selectedProductUploadedDoc = useMemo(() => {
    if (!usesProductSelector || !selectedProductId) return null;
    return productsWithStatus.find(p => String(p.id) === String(selectedProductId))?.uploadedDoc || null;
  }, [usesProductSelector, selectedProductId, productsWithStatus]);

  const hasAutoExpiry = !!(selectedDocInfo?.requires_expiry && selectedDocInfo?.expiry_months);

  const autoExpiryDisplay = useMemo(() => {
    if (!hasAutoExpiry || !issueDate) return null;
    const d = new Date(issueDate + 'T12:00:00');
    d.setMonth(d.getMonth() + selectedDocInfo.expiry_months);
    return d.toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });
  }, [hasAutoExpiry, issueDate, selectedDocInfo?.expiry_months]);

  const uploadMutation = useMutation({
    mutationFn: providerDocumentService.upload,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-required-documents']);
      queryClient.invalidateQueries(['provider-documents']);
      queryClient.invalidateQueries(['provider-stats']);
      setSelectedFile(null); setSelectedDocType(''); setSelectedProductId('');
      setIssueDate(''); setExpiryDate(''); setUploadError('');
      showToast.success('🎉 ¡Documento cargado exitosamente!');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al cargar documento';
      setUploadError(msg); showToast.error(msg);
    },
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (file) => {
    const allowed = [
      'application/pdf','image/jpeg','image/jpg','image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) { setUploadError('Tipo de archivo no permitido. Solo PDF, imágenes y Word.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('El archivo es demasiado grande. Máximo 10MB.'); return; }
    setSelectedFile(file); setUploadError('');
    showToast.success('✓ Archivo seleccionado correctamente');
  };

  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['Bytes','KB','MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // ✅ Descarga de template genérica
  const handleDownloadTemplate = async (tmpl) => {
    if (!tmpl) return;
    setDownloadingTemplate(true);
    try {
      const response = await api.get(`/document-templates/${tmpl.id}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', tmpl.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast.success('Formato descargado');
    } catch { showToast.error('Error al descargar el formato'); }
    finally { setDownloadingTemplate(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDocType)  { setUploadError('Selecciona un tipo de documento'); return; }
    if (!selectedFile)     { setUploadError('Selecciona un archivo'); return; }
    if (usesProductSelector && !selectedProductId) {
      setUploadError('Selecciona el producto al que corresponde este documento'); return;
    }
    if (usesProductSelector && selectedProductAlreadyUploaded) {
      setUploadError('Este producto ya tiene un documento en revisión o aprobado'); return;
    }
    if (hasAutoExpiry && !issueDate) {
      setUploadError('La fecha de emisión es obligatoria para este documento'); return;
    }

    const selectedDoc = allDocuments?.find(d => d.id === parseInt(selectedDocType));
    const { allowed, reason } = canUploadDocument(selectedDoc);
    if (!allowed) { setUploadError(reason); return; }

    let finalExpiryDate = expiryDate || null;
    if (hasAutoExpiry && issueDate) {
      const d = new Date(issueDate + 'T12:00:00');
      d.setMonth(d.getMonth() + selectedDocInfo.expiry_months);
      finalExpiryDate = d.toLocaleDateString('en-CA');
    }

    uploadMutation.mutate({
      file:             selectedFile,
      document_type_id: selectedDocType,
      issue_date:       issueDate       || null,
      expiry_date:      finalExpiryDate,
      product_name:     finalProductName || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"/>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // ─── Helper: recuadro de formato ──────────────────────────────────────────
  const TemplateBox = ({ tmpl, productLabel }) => (
    <div className={`p-5 border-2 rounded-xl transition-all ${
      tmpl ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg shadow-sm ${
          tmpl ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-200'
        }`}>
          <FileBadge className={`w-5 h-5 ${tmpl ? 'text-white' : 'text-gray-400'}`}/>
        </div>
        <div className="flex-1">
          {tmpl ? (
            <>
              <p className="text-sm font-bold text-emerald-900">
                Este documento requiere seguir un formato específico
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                {productLabel
                  ? <>Para <span className="font-semibold">{productLabel}</span> debes usar el formato tipo <span className="font-semibold">"{tmpl.template_name}"</span>. Descárgalo, complétalo y súbelo aquí.</>
                  : 'Descarga el formato, complétalo con la información solicitada y súbelo aquí.'
                }
              </p>
              <button type="button" onClick={() => handleDownloadTemplate(tmpl)}
                disabled={downloadingTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-semibold text-white transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60">
                <Download className="w-4 h-4"/>
                {downloadingTemplate ? 'Descargando...' : `Descargar formato: ${tmpl.filename}`}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-600">Formato del documento</p>
              <p className="mt-1 text-xs text-gray-400">
                {productLabel
                  ? <>No hay formato específico para <span className="font-medium">{productLabel}</span>. Contacta a Calidad.</>
                  : 'No hay un formato cargado aún. Contacta a Calidad si necesitas el formato correspondiente.'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Upload className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cargar Documentos</h1>
            <p className="text-sm text-gray-600">Sube los documentos requeridos para mantener tu cuenta activa</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Selector tipo de documento ─────────────────────────────────────── */}
        <div className="p-6 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
          <label className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-900">
            <FileText className="w-4 h-4 text-primary-600"/>Tipo de Documento *
          </label>
          <select value={selectedDocType}
            onChange={(e) => {
              setSelectedDocType(e.target.value);
              setSelectedFile(null); setSelectedProductId('');
              setIssueDate(''); setExpiryDate(''); setUploadError('');
            }}
            required
            className="w-full px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="">Selecciona un documento...</option>
            {requiredDocs.length > 0 && (
              <optgroup label="── Documentación Obligatoria ──">
                {requiredDocs.map((doc) => {
                  const { allowed } = canUploadDocument(doc);
                  return (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.allows_multiple ? ' (múltiples)' : ''}{!allowed ? ' 🔒' : doc.uploaded ? ' ✓' : ''}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {recommendedDocs.length > 0 && (
              <optgroup label="── Documentación Recomendada ──">
                {recommendedDocs.map((doc) => {
                  const { allowed } = canUploadDocument(doc);
                  return (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.allows_multiple ? ' (múltiples)' : ''}{!allowed ? ' 🔒' : doc.uploaded ? ' ✓' : ''}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>

          {selectedDocInfo && (
            <div className="mt-4">
              {!canUpload ? (
                <div className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 bg-gray-200 rounded-lg w-9 h-9">
                      <Lock className="w-4 h-4 text-gray-500"/>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Carga no disponible</p>
                      <p className="mt-1 text-sm text-gray-500">{blockReason}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-2 border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg shadow-md">
                      <Info className="w-4 h-4 text-white"/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
                        {selectedDocInfo.description || 'Sin descripción adicional'}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {selectedDocInfo.requires_expiry && (
                          <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                            <AlertCircle className="w-3.5 h-3.5"/>
                            {hasAutoExpiry
                              ? `Vence automáticamente a los ${selectedDocInfo.expiry_months} ${selectedDocInfo.expiry_months === 1 ? 'mes' : 'meses'}`
                              : 'Requiere fecha de vencimiento'}
                          </span>
                        )}
                        {selectedDocInfo.allows_multiple && (
                          <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                            <Layers className="w-3.5 h-3.5"/>Sube uno por cada producto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ Recuadro de formato para documentos SIN producto (Carta No Trabajo Infantil) */}
        {isSingleFormatDoc && canUpload && (
          <TemplateBox tmpl={singleTemplate} productLabel={null}/>
        )}

        {/* ── Selector de producto ───────────────────────────────────────────── */}
        {usesProductSelector && selectedDocInfo && canUpload && (
          <div className="p-6 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <label className="flex items-center gap-2 mb-1 text-sm font-bold text-gray-900">
              <Package className="w-4 h-4 text-primary-600"/>
              Producto <span className="text-red-500">*</span>
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Selecciona el producto. Debes subir un archivo por cada producto.
            </p>
            {allMyItems.length === 0 ? (
              <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">No tienes productos registrados</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Ve a <strong>Mi Perfil → Productos y Servicios</strong> para registrar los productos que ofreces.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Package className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2"/>
                  <select value={selectedProductId}
                    onChange={(e) => { setSelectedProductId(e.target.value); setUploadError(''); }}
                    required
                    className="w-full py-3 pl-10 pr-10 text-sm bg-white border-2 border-gray-300 appearance-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">Selecciona un producto...</option>
                    {myProducts.length > 0 && (
                      <optgroup label="── Productos ──">
                        {productsWithStatus.filter(p => p.type === 'product').map(p => (
                          <option key={p.id} value={p.id} disabled={p.alreadyUploaded}>
                            {p.name}{p.alreadyUploaded ? ' 🔒 (ya subido)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {myServices.length > 0 && (
                      <optgroup label="── Servicios ──">
                        {productsWithStatus.filter(p => p.type === 'service').map(p => (
                          <option key={p.id} value={p.id} disabled={p.alreadyUploaded}>
                            {p.name}{p.alreadyUploaded ? ' 🔒 (ya subido)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2"/>
                </div>

                {selectedProductAlreadyUploaded && selectedProductUploadedDoc && (
                  <div className="flex items-start gap-3 p-3 mt-3 border-2 border-amber-200 rounded-xl bg-amber-50">
                    <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Este producto ya tiene un documento cargado</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Estado:{' '}
                        <span className={`font-bold ${selectedProductUploadedDoc.status === 'approved' ? 'text-green-700' : 'text-amber-700'}`}>
                          {selectedProductUploadedDoc.status === 'approved' ? 'Aprobado' : 'En revisión'}
                        </span>. No puedes subir otro hasta que sea rechazado o venza.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ✅ Recuadro de formato para documentos CON producto (Carta Garantía) */}
        {hasTemplate && !isSingleFormatDoc && selectedProductName && canUpload && !selectedProductAlreadyUploaded && (
          <TemplateBox tmpl={template} productLabel={selectedProductName}/>
        )}

        {/* ── Zona drag & drop ───────────────────────────────────────────────── */}
        <div
          className={`relative p-8 border-2 border-dashed rounded-xl transition-all duration-200
            ${!selectedDocType || !canUpload || selectedProductAlreadyUploaded
              ? 'opacity-50 pointer-events-none bg-gray-50' : ''}
            ${dragActive ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-gray-300 bg-white hover:border-primary-300'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <input type="file" id="file-input" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            disabled={!selectedDocType || !canUpload || selectedProductAlreadyUploaded}/>
          {selectedFile ? (
            <div className="flex items-center justify-between p-4 border-2 border-green-200 rounded-xl bg-green-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-lg shadow-md w-14 h-14 bg-gradient-to-br from-green-500 to-green-600">
                  <File className="text-white w-7 h-7"/>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedFile(null)} className="p-2 text-red-600 rounded-lg hover:bg-red-50">
                <X className="w-6 h-6"/>
              </button>
            </div>
          ) : (
            <label htmlFor="file-input" className="block text-center cursor-pointer">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100">
                <Upload className="w-10 h-10 text-primary-600"/>
              </div>
              <p className="mb-2 text-xl font-bold text-gray-900">Arrastra tu archivo aquí</p>
              <p className="mb-4 text-sm text-gray-600">o haz clic para seleccionar</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-primary-50 border-primary-200">
                <FileText className="w-4 h-4 text-primary-600"/>
                <p className="text-xs font-semibold text-primary-700">PDF, JPG, PNG o Word — Máximo 10MB</p>
              </div>
            </label>
          )}
        </div>

        {/* ── Fechas ────────────────────────────────────────────────────────── */}
        {selectedDocInfo?.requires_expiry && canUpload && !selectedProductAlreadyUploaded && (
          <div className="p-6 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
              <Calendar className="w-5 h-5 text-primary-600"/>Fechas del Documento
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Fecha de Emisión {hasAutoExpiry && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Calendar className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
                  <input type="date" value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required={hasAutoExpiry}
                    className="w-full py-3 pl-10 pr-4 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"/>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Fecha de Vencimiento {!hasAutoExpiry && <span className="text-red-500">*</span>}
                </label>
                {hasAutoExpiry ? (
                  <div className={`w-full min-h-[50px] py-3 px-4 rounded-xl border-2 flex items-center transition-all ${
                    autoExpiryDisplay ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {autoExpiryDisplay ? (
                      <div>
                        <p className="text-sm font-bold capitalize text-amber-800">{autoExpiryDisplay}</p>
                        <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3"/>
                          Calculado · {selectedDocInfo.expiry_months} {selectedDocInfo.expiry_months === 1 ? 'mes' : 'meses'} desde la emisión
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Ingresa la fecha de emisión para ver el vencimiento</p>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Calendar className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
                    <input type="date" value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={issueDate || new Date().toISOString().split('T')[0]}
                      required={selectedDocInfo?.requires_expiry}
                      className="w-full py-3 pl-10 pr-4 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"/>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {uploadError && (
          <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-bold text-red-900">Error</p>
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" leftIcon={<Upload className="w-4 h-4"/>}
            disabled={
              !selectedDocType || !selectedFile || !canUpload ||
              (usesProductSelector && (!selectedProductId || selectedProductAlreadyUploaded))
            }
            loading={uploadMutation.isPending} className="flex-1">
            Cargar Documento
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/provider/documents')}>Cancelar</Button>
        </div>
      </form>

      {/* Info adicional */}
      <div className="p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg shadow-md">
            <Info className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h4 className="mb-3 font-bold text-blue-900">Información importante:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              {[
                'Los documentos serán revisados por el área de Calidad.',
                'Solo puedes renovar documentos que estén vencidos o a 30 días de vencer.',
                'Si un documento está en revisión, espera la respuesta antes de subir uno nuevo.',
                'Para documentos con múltiples productos, sube un archivo por cada producto.',
                'Recibirás una notificación cuando sean aprobados o rechazados.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"/>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
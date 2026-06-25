import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { canUploadDocument } from '../../utils/documentUploadRules';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
  Upload, FileText, X, AlertCircle, CheckCircle,
  Clock, Calendar, Lock, Info,
} from 'lucide-react';

export const DocumentUploadModal = ({ isOpen, onClose, providerId, documentTypes }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    document_type_id: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });
  const [file, setFile]             = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError]           = useState('');

  const safeDocumentTypes = Array.isArray(documentTypes) ? documentTypes : [];

  // ── Traer estado actual de documentos (para bloqueo) ──────────────────────
  const { data: requiredData } = useQuery({
    queryKey: ['provider-required-documents', providerId],
    queryFn: () => documentService.getRequired(providerId),
    enabled: isOpen && !!providerId,
  });

  // Mapa: document_type_id → item del required endpoint
  // El required endpoint devuelve { document_type, is_required, uploaded, document }
  // canUploadDocument del portal proveedor espera: { uploaded, uploaded_document: { status, expiry_date } }
  // Adaptamos el shape para reutilizar la misma utilidad
  const uploadedMap = useMemo(() => {
    const allDocs = requiredData?.required_documents || [];
    const map = {};
    allDocs.forEach(item => {
      const typeId = item.document_type?.id;
      if (!typeId) return;
      // Adaptar al shape que espera canUploadDocument
      map[typeId] = {
        uploaded: item.uploaded,
        allows_multiple: item.allows_multiple,
        uploaded_document: item.document
          ? { status: item.document.status, expiry_date: item.document.expiry_date }
          : null,
      };
    });
    return map;
  }, [requiredData]);

  // ── Tipo seleccionado ─────────────────────────────────────────────────────
  const selectedDocType = useMemo(() =>
    safeDocumentTypes.find(t => String(t.id) === String(formData.document_type_id)) || null,
    [safeDocumentTypes, formData.document_type_id]
  );

  // Evaluar bloqueo con la misma lógica que el portal proveedor
  const { allowed: canUpload, reason: blockReason } = useMemo(() => {
    if (!selectedDocType) return { allowed: false, reason: null };
    // allows_multiple nunca se bloquea
    if (selectedDocType.allows_multiple) return { allowed: true, reason: null };
    const mapped = uploadedMap[selectedDocType.id];
    return canUploadDocument(mapped || { uploaded: false, uploaded_document: null });
  }, [selectedDocType, uploadedMap]);

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

  // Etiqueta de opción con estado visual
  const optionLabel = (type) => {
    const mapped = uploadedMap[type.id];
    const { allowed } = canUploadDocument(
      type.allows_multiple
        ? { uploaded: false, uploaded_document: null }
        : (mapped || { uploaded: false, uploaded_document: null })
    );
    const suffix = type.allows_multiple ? ' (múltiples)' : '';
    const lock   = !allowed ? ' 🔒' : (mapped?.uploaded ? ' ✓' : '');
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
      setFile(null); setError('');
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.document_type_id) { setError('Debe seleccionar el tipo de documento'); return; }
    if (!canUpload)                  { setError(blockReason || 'No se puede subir este documento'); return; }
    if (!file)                       { setError('Debe seleccionar un archivo'); return; }
    if (hasAutoExpiry && !formData.issue_date) { setError('La fecha de emisión es requerida para este documento'); return; }

    const data = new FormData();
    data.append('file', file);
    data.append('document_type_id', formData.document_type_id);
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
    setFile(null); setError(''); onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Subir Documento"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="primary"
            loading={mutation.isPending}
            disabled={!formData.document_type_id || !canUpload || safeDocumentTypes.length === 0}
            onClick={handleSubmit}
          >
            Subir Documento
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Select tipo de documento ── */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-900">
            <FileText className="w-4 h-4 text-primary-600" />
            Tipo de Documento <span className="text-red-500">*</span>
          </label>
          <select
            name="document_type_id"
            value={formData.document_type_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecciona un documento...</option>
            {requiredDocs.length > 0 && (
              <optgroup label="── Documentación Obligatoria ──">
                {requiredDocs.map(t => (
                  <option key={t.id} value={t.id}>{optionLabel(t)}</option>
                ))}
              </optgroup>
            )}
            {optionalDocs.length > 0 && (
              <optgroup label="── Documentación Opcional ──">
                {optionalDocs.map(t => (
                  <option key={t.id} value={t.id}>{optionLabel(t)}</option>
                ))}
              </optgroup>
            )}
            {/* Fallback si no hay pivot (no hay distinción obligatorio/opcional) */}
            {requiredDocs.length === 0 && optionalDocs.length === 0 &&
              safeDocumentTypes.map(t => (
                <option key={t.id} value={t.id}>{optionLabel(t)}</option>
              ))
            }
          </select>

          {/* Info / bloqueo debajo del select */}
          {selectedDocType && (
            <div className="mt-3">
              {!canUpload ? (
                <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 bg-gray-200 rounded-lg">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Carga no disponible</p>
                    <p className="mt-1 text-sm text-gray-500">{blockReason}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg shadow-md">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">
                      {selectedDocType.description || 'Sin descripción adicional'}
                    </p>
                    {selectedDocType.requires_expiry && (
                      <p className="flex items-center gap-1 mt-1 text-xs font-medium text-blue-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {hasAutoExpiry
                          ? `Vence automáticamente a los ${selectedDocType.expiry_months} ${selectedDocType.expiry_months === 1 ? 'mes' : 'meses'}`
                          : 'Requiere fecha de vencimiento'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Drag & drop — oculto si bloqueado ── */}
        {canUpload && (
          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
              dragActive    ? 'border-primary bg-primary-50 scale-[1.02]' :
              file          ? 'border-green-400 bg-green-50' :
              !selectedDocType ? 'opacity-50 pointer-events-none border-gray-200 bg-gray-50' :
              'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag} onDragLeave={handleDrag}
            onDragOver={handleDrag}  onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              disabled={!selectedDocType}
            />
            {!file ? (
              <div className="animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-100">
                  <Upload className="w-8 h-8 text-primary-600" />
                </div>
                <p className="mb-2 text-base font-medium text-gray-700">Arrastra y suelta tu archivo aquí</p>
                <p className="mb-3 text-sm text-gray-500">o haz clic para seleccionar</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-primary-700 bg-primary-50">
                  <FileText className="w-4 h-4" />PDF, Imagen, Word, Excel (Máx. 10MB)
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-white border-2 border-green-400 rounded-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {file.name}<CheckCircle className="w-4 h-4 text-green-600" />
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)}
                  className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* ── Fechas — igual que portal proveedor ── */}
        {selectedDocType?.requires_expiry && canUpload && (
          <div className="p-5 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-900">
              <Calendar className="w-4 h-4 text-primary-600" />Fechas del Documento
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Fecha emisión */}
              <Input
                label={
                  <span>
                    Fecha de Emisión{hasAutoExpiry && <span className="text-red-500"> *</span>}
                  </span>
                }
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                required={hasAutoExpiry}
              />

              {/* Fecha vencimiento — calculada (solo lectura) o editable */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Fecha de Vencimiento{!hasAutoExpiry && <span className="text-red-500"> *</span>}
                </label>
                {hasAutoExpiry ? (
                  <div className={`w-full min-h-[46px] py-3 px-4 rounded-xl border-2 flex items-center transition-all ${
                    calculatedExpiryDisplay ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {calculatedExpiryDisplay ? (
                      <div>
                        <p className="text-sm font-bold capitalize text-amber-800">{calculatedExpiryDisplay}</p>
                        <p className="flex items-center gap-1 mt-0.5 text-xs text-amber-600">
                          <Clock className="w-3 h-3" />
                          Calculado · {selectedDocType.expiry_months} {selectedDocType.expiry_months === 1 ? 'mes' : 'meses'} desde la emisión
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Ingresa la fecha de emisión para ver el vencimiento</p>
                    )}
                  </div>
                ) : (
                  <Input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    min={formData.issue_date || new Date().toISOString().split('T')[0]}
                    required
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fechas sin requires_expiry — ambos opcionales en grid */}
        {selectedDocType && !selectedDocType.requires_expiry && canUpload && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Fecha de Emisión"
              type="date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleChange}
            />
            <Input
              label="Fecha de Vencimiento"
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
            />
          </div>
        )}

        {/* ── Notas ── */}
        {canUpload && (
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Notas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 transition-all duration-200 border-2 border-gray-300 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Observaciones adicionales sobre el documento..."
            />
          </div>
        )}

      </form>
    </Modal>
  );
};
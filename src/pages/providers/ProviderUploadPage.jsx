import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { providerDashboardService } from '../../api/providerDashboardService';
import { providerDocumentService } from '../../api/providerDocumentService';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { showToast } from '../../utils/toast';
import { canUploadDocument } from '../../utils/documentUploadRules';
import {
  Upload, FileText, X, CheckCircle, AlertCircle,
  Calendar, File, Info, Lock, ShieldCheck,
} from 'lucide-react';

export const ProviderUploadPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('document');

  const [selectedDocType, setSelectedDocType] = useState(preselectedDocId || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: requiredData, isLoading } = useQuery({
    queryKey: ['provider-required-documents'],
    queryFn: providerDashboardService.getRequiredDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: providerDocumentService.upload,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-required-documents']);
      queryClient.invalidateQueries(['provider-documents']);
      queryClient.invalidateQueries(['provider-stats']);
      setSelectedFile(null);
      setSelectedDocType('');
      setIssueDate('');
      setExpiryDate('');
      setUploadError('');
      showToast.success('🎉 ¡Documento cargado exitosamente!');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al cargar documento';
      setUploadError(msg);
      showToast.error(msg);
    },
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (file) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      setUploadError('Tipo de archivo no permitido. Solo PDF, imágenes y Word.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    showToast.success('✓ Archivo seleccionado correctamente');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDocType) { setUploadError('Selecciona un tipo de documento'); return; }
    if (!selectedFile)    { setUploadError('Selecciona un archivo'); return; }

    // ✅ Doble verificación antes de enviar
    const selectedDoc = requiredData?.required_documents?.find(d => d.id === parseInt(selectedDocType));
    const { allowed, reason } = canUploadDocument(selectedDoc);
    if (!allowed) { setUploadError(reason); return; }

    uploadMutation.mutate({
      file: selectedFile,
      document_type_id: selectedDocType,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
    });
  };

  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Documento seleccionado actualmente
  const selectedDocInfo = selectedDocType
    ? requiredData?.required_documents?.find(d => d.id === parseInt(selectedDocType))
    : null;

  // ✅ Verificar si el documento seleccionado puede ser subido
  const { allowed: canUpload, reason: blockReason } = canUploadDocument(selectedDocInfo);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cargar Documentos</h1>
            <p className="text-sm text-gray-600">Sube los documentos requeridos para mantener tu cuenta activa</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Selector de tipo */}
        <div className="p-6 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
          <label className="flex items-center block gap-2 mb-2 text-sm font-bold text-gray-900">
            <FileText className="w-4 h-4 text-primary-600" />
            Tipo de Documento *
          </label>
          <Select
            value={selectedDocType}
            onChange={(e) => {
              setSelectedDocType(e.target.value);
              setSelectedFile(null);
              setUploadError('');
            }}
            options={[
              { value: '', label: 'Selecciona un documento...' },
              ...(requiredData?.required_documents?.map((doc) => {
                const { allowed } = canUploadDocument(doc);
                return {
                  value: doc.id,
                  label: `${doc.name}${doc.is_required ? ' (Requerido)' : ''}${!allowed ? ' 🔒' : doc.uploaded ? ' ✓' : ''}`,
                };
              }) || []),
            ]}
            required
          />

          {/* ✅ Estado del documento seleccionado */}
          {selectedDocInfo && (
            <>
              {/* Bloqueado */}
              {!canUpload && (
                <div className="p-4 mt-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 bg-gray-200 rounded-lg w-9 h-9">
                      <Lock className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Carga no disponible</p>
                      <p className="mt-1 text-sm text-gray-500">{blockReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Permitido — info del documento */}
              {canUpload && (
                <div className="p-4 mt-4 border-2 border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg shadow-md">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        {selectedDocInfo.description || 'Sin descripción adicional'}
                      </p>
                      {selectedDocInfo.requires_expiry && (
                        <p className="flex items-center gap-1 mt-1 text-sm text-blue-800">
                          <AlertCircle className="w-4 h-4" />
                          Este documento requiere fecha de vencimiento
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ✅ Zona de carga — deshabilitada si el documento está bloqueado */}
        <div
          className={`relative p-8 border-2 border-dashed rounded-xl transition-all duration-200
            ${!selectedDocType || !canUpload ? 'opacity-50 pointer-events-none bg-gray-50' : ''}
            ${dragActive ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-gray-300 bg-white hover:border-primary-300'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-input"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            disabled={!selectedDocType || !canUpload}
          />

          {selectedFile ? (
            <div className="flex items-center justify-between p-4 border-2 border-green-200 rounded-xl bg-green-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-lg shadow-md w-14 h-14 bg-gradient-to-br from-green-500 to-green-600">
                  <File className="text-white w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedFile(null)} className="p-2 text-red-600 rounded-lg hover:bg-red-50">
                <X className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <label htmlFor="file-input" className="block text-center cursor-pointer">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100">
                <Upload className="w-10 h-10 text-primary-600" />
              </div>
              <p className="mb-2 text-xl font-bold text-gray-900">Arrastra tu archivo aquí</p>
              <p className="mb-4 text-sm text-gray-600">o haz click para seleccionar</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-primary-50 border-primary-200">
                <FileText className="w-4 h-4 text-primary-600" />
                <p className="text-xs font-semibold text-primary-700">PDF, JPG, PNG o Word — Máximo 10MB</p>
              </div>
            </label>
          )}
        </div>

        {/* Fechas — solo si el documento las requiere y no está bloqueado */}
        {selectedDocInfo?.requires_expiry && canUpload && (
          <div className="p-6 bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
              <Calendar className="w-5 h-5 text-primary-600" />
              Fechas del Documento
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Fecha de Emisión</label>
                <div className="relative">
                  <Calendar className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full py-3 pl-10 pr-4 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Fecha de Vencimiento *</label>
                <div className="relative">
                  <Calendar className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={issueDate || new Date().toISOString().split('T')[0]}
                    required={selectedDocInfo?.requires_expiry}
                    className="w-full py-3 pl-10 pr-4 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {uploadError && (
          <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">Error</p>
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Upload className="w-4 h-4" />}
            disabled={!selectedDocType || !selectedFile || !canUpload}
            loading={uploadMutation.isPending}
            className="flex-1"
          >
            Cargar Documento
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/provider/documents')}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Info adicional */}
      <div className="p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg shadow-md">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="mb-3 font-bold text-blue-900">Información importante:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              {[
                'Los documentos serán revisados por el área de Calidad.',
                'Solo puedes renovar documentos que estén vencidos o a 30 días de vencer.',
                'Si un documento está en revisión, espera la respuesta antes de subir uno nuevo.',
                'Recibirás una notificación cuando sean aprobados o rechazados.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
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
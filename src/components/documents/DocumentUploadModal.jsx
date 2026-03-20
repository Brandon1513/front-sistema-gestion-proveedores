import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../../api/documentService';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';

export const DocumentUploadModal = ({ isOpen, onClose, providerId, documentTypes }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    document_type_id: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  // Asegurar que documentTypes siempre sea un array
  const safeDocumentTypes = Array.isArray(documentTypes) ? documentTypes : [];
  
  const mutation = useMutation({
    mutationFn: (data) => documentService.upload(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-documents', providerId]);
      queryClient.invalidateQueries(['provider-required-documents', providerId]);
      handleClose();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al subir el documento');
    },
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    // Validar tamaño (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10MB');
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Solo se permiten archivos PDF, imágenes, Word y Excel');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!file) {
      setError('Debe seleccionar un archivo');
      return;
    }

    if (!formData.document_type_id) {
      setError('Debe seleccionar el tipo de documento');
      return;
    }

    const submitData = new FormData();
    submitData.append('file', file);
    submitData.append('document_type_id', formData.document_type_id);
    if (formData.issue_date) submitData.append('issue_date', formData.issue_date);
    if (formData.expiry_date) submitData.append('expiry_date', formData.expiry_date);
    if (formData.notes) submitData.append('notes', formData.notes);

    mutation.mutate(submitData);
  };

  const handleClose = () => {
    setFormData({
      document_type_id: '',
      issue_date: '',
      expiry_date: '',
      notes: '',
    });
    setFile(null);
    setError('');
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Preparar opciones para el Select
  const documentTypeOptions = safeDocumentTypes.map(type => ({
    value: type.id,
    label: type.name || type.document_type?.name || 'Sin nombre',
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Subir Documento"
      size="lg"
      footer={
        <>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            loading={mutation.isPending}
            disabled={safeDocumentTypes.length === 0}
            onClick={handleSubmit}
          >
            Subir Documento
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Área de drag & drop */}
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center 
            transition-all duration-200
            ${dragActive 
              ? 'border-primary bg-primary-50 scale-[1.02]' 
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          />
          
          {!file ? (
            <div className="animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-100">
                <Upload className="w-8 h-8 text-primary-600" />
              </div>
              <p className="mb-2 text-base font-medium text-gray-700">
                Arrastra y suelta tu archivo aquí
              </p>
              <p className="mb-3 text-sm text-gray-500">
                o haz clic para seleccionar
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-primary-700 bg-primary-50">
                <FileText className="w-4 h-4" />
                PDF, Imagen, Word, Excel (Máx. 10MB)
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
                    {file.name}
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Alerta de error */}
        {error && (
          <div className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-xl bg-red-50 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* Sin tipos de documentos disponibles */}
        {safeDocumentTypes.length === 0 ? (
          <div className="p-4 border-2 border-accent-200 rounded-xl bg-accent-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-1 text-sm font-medium text-accent-800">
                  No hay tipos de documentos disponibles
                </p>
                <p className="text-xs text-accent-700">
                  Contacta al administrador para configurar los documentos requeridos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Select
            label="Tipo de Documento"
            name="document_type_id"
            value={formData.document_type_id}
            onChange={handleChange}
            options={documentTypeOptions}
            required
          />
        )}

        {/* Fechas */}
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

        {/* Notas */}
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 transition-all duration-200 border-2 border-gray-300 resize-none  rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Observaciones adicionales sobre el documento..."
          />
        </div>
      </form>
    </Modal>
  );
};
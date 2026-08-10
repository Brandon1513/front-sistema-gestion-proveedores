import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../../utils/toast';
import { genericTemplateService } from '../../api/templateService';
import { FileBadge, FileUp, AlertCircle, Download, Trash2 } from 'lucide-react';

export const GenericTemplatesSection = ({ documentTypeId }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['document-templates-generic', documentTypeId],
    queryFn: () => genericTemplateService.getAll(documentTypeId),
    enabled: !!documentTypeId,
  });
  const templates = data?.templates || [];

  const uploadMutation = useMutation({
    mutationFn: (files) => genericTemplateService.upload(documentTypeId, files),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['document-templates-generic', documentTypeId]);
      showToast.success(res.message || 'Plantilla(s) adjuntada(s) correctamente');
      setUploadError('');
    },
    onError: (err) => setUploadError(err.response?.data?.message || 'Error al subir plantilla(s)'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => genericTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-templates-generic', documentTypeId]);
      showToast.success('Plantilla eliminada');
    },
    onError: () => showToast.error('Error al eliminar la plantilla'),
  });

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (templates.length + files.length > 5) { setUploadError('Máximo 5 plantillas por documento'); return; }
    uploadMutation.mutate(files);
    e.target.value = '';
  };

  const handleDownload = async (tmpl) => {
    try {
      const response = await genericTemplateService.download(tmpl.id);
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', tmpl.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast.error('Error al descargar'); }
  };

  return (
    <div className="p-4 space-y-3 border-2 border-gray-200 rounded-xl bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <FileBadge className="w-4 h-4 text-emerald-500"/>Plantillas de apoyo <span className="font-normal text-gray-400">(opcional)</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            El proveedor podrá descargarlas al momento de subir este documento. Puedes adjuntar hasta 5 (PDF, Word o Excel).
          </p>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending || templates.length >= 5}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          <FileUp className="w-3.5 h-3.5"/>
          {uploadMutation.isPending ? 'Subiendo...' : 'Adjuntar archivo(s)'}
        </button>
        {/* ✅ FIX — ahora acepta también Excel (.xlsx, .xls) */}
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden"
          onChange={handleFilesSelected}/>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 p-2.5 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-red-700">{uploadError}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">Cargando plantillas...</p>
      ) : templates.length === 0 ? (
        <p className="text-xs italic text-gray-400">Sin plantillas adjuntas todavía</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <FileBadge className="flex-shrink-0 w-4 h-4 text-emerald-500"/>
                <p className="text-xs font-medium text-gray-700 truncate">{t.original_filename}</p>
              </div>
              <div className="flex items-center flex-shrink-0 gap-1 ml-2">
                <button type="button" onClick={() => handleDownload(t)}
                  className="p-1.5 text-blue-600 rounded-lg hover:bg-blue-50" title="Descargar">
                  <Download className="w-3.5 h-3.5"/>
                </button>
                <button type="button" onClick={() => deleteMutation.mutate(t.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
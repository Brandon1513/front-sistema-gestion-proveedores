import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { X, Download, FileText, AlertCircle, ExternalLink } from 'lucide-react';

const PREVIEWABLE = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

const extOf = (doc) =>
  (doc?.file_extension || doc?.original_filename?.split('.').pop() || doc?.file_path?.split('.').pop() || '').toLowerCase();

/** ¿Se puede ver en el navegador? (PDF e imágenes) */
export const canPreviewDocument = (doc) => PREVIEWABLE.includes(extOf(doc));

/**
 * Vista previa de un documento del proveedor (PDF o imagen) sin descargarlo.
 * Pide el archivo con el token de la sesión (axios), así no viaja el token en la URL.
 */
export const DocumentPreviewModal = ({ providerId, document: doc, onClose, onDownload }) => {
  const [url, setUrl]       = useState(null);
  const [error, setError]   = useState('');
  const ext   = extOf(doc);
  const isPdf = ext === 'pdf';
  const title = doc?.document_type?.name || doc?.document_type_name || 'Documento';
  const name  = doc?.original_filename || doc?.file_name || 'documento';

  useEffect(() => {
    let objectUrl; let alive = true;
    api.get(`/providers/${providerId}/documents/${doc.id}/view`, { responseType: 'blob' })
      .then(r => {
        if (!alive) return;
        const type = r.headers['content-type'] || (isPdf ? 'application/pdf' : 'image/*');
        objectUrl = URL.createObjectURL(new Blob([r.data], { type }));
        setUrl(objectUrl);
      })
      .catch(() => alive && setError('No se pudo cargar la vista previa del documento.'));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [providerId, doc.id, isPdf]);

  // Cerrar con Esc
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col w-full max-w-5xl h-[92vh] bg-white shadow-2xl rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50">
          <div className="flex items-center min-w-0 gap-3">
            <div className="flex items-center justify-center flex-shrink-0 rounded-lg shadow-md w-9 h-9 bg-gradient-primary"><FileText className="w-4 h-4 text-white"/></div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{title}</p>
              <p className="text-xs text-gray-500 truncate">{name}</p>
            </div>
          </div>
          <div className="flex items-center flex-shrink-0 gap-1">
            {url && (
              <a href={url} target="_blank" rel="noreferrer" title="Abrir en otra pestaña"
                className="p-2 text-gray-500 rounded-lg hover:bg-white hover:text-primary-700"><ExternalLink className="w-5 h-5"/></a>
            )}
            {onDownload && (
              <button onClick={() => onDownload(doc)} title="Descargar"
                className="p-2 text-gray-500 rounded-lg hover:bg-white hover:text-primary-700"><Download className="w-5 h-5"/></button>
            )}
            <button onClick={onClose} title="Cerrar" className="p-2 text-gray-400 rounded-lg hover:bg-white"><X className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 overflow-auto bg-gray-100">
          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400"/>
              <p className="text-sm text-gray-600">{error}</p>
              {onDownload && <button onClick={() => onDownload(doc)} className="mt-3 text-sm font-semibold text-primary-600 hover:underline">Descargar el archivo</button>}
            </div>
          ) : !url ? (
            <div className="w-10 h-10 border-4 rounded-full border-t-primary-500 animate-spin"/>
          ) : isPdf ? (
            <iframe src={url} title={title} className="w-full h-full border-0"/>
          ) : (
            <img src={url} alt={title} className="object-contain max-w-full max-h-full"/>
          )}
        </div>
      </div>
    </div>
  );
};
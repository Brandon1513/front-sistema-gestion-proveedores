import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImagePlus, Trash2, Send, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { changeRequestService } from '../../api/changeRequestService';
import { showToast } from '../../utils/toast';

const MAX_IMAGES   = 5;
const MAX_BYTES    = 5 * 1024 * 1024;
const MIN_CHARS    = 10;
const MAX_CHARS    = 3000;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export const ChangeRequestModal = ({ open, onClose, documentType }) => {
  const queryClient  = useQueryClient();
  const fileInputRef = useRef(null);
  const textareaRef  = useRef(null);

  const [description, setDescription] = useState('');
  const [images, setImages]           = useState([]);
  const [error, setError]             = useState('');

  // Previews con limpieza de object URLs
  const previews = useMemo(() => images.map(f => ({ file: f, url: URL.createObjectURL(f) })), [images]);
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)), [previews]);

  // Reiniciar al abrir y enfocar el cuadro de texto
  useEffect(() => {
    if (open) {
      setDescription(''); setImages([]); setError('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: changeRequestService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-change-request', documentType?.id], exact: false });
      showToast.success(data?.message || 'Solicitud enviada');
      onClose();
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      const first  = errors ? Object.values(errors).flat()[0] : null;
      setError(first || err.response?.data?.message || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    },
  });

  // Cerrar con Escape (salvo mientras se envía)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !mutation.isPending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mutation.isPending, onClose]);

  if (!open || !documentType) return null;

  const handleAddImages = (fileList) => {
    setError('');
    const incoming = Array.from(fileList || []);
    const valid = [];
    for (const f of incoming) {
      if (!ALLOWED_MIME.includes(f.type)) { setError(`"${f.name}" no es JPG, PNG o WEBP.`); continue; }
      if (f.size > MAX_BYTES)             { setError(`"${f.name}" pesa más de 5 MB.`); continue; }
      valid.push(f);
    }
    const room = MAX_IMAGES - images.length;
    if (valid.length > room) setError(`Puedes adjuntar hasta ${MAX_IMAGES} imágenes.`);
    setImages(prev => [...prev, ...valid.slice(0, Math.max(0, room))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const trimmed  = description.trim();
  const canSend  = trimmed.length >= MIN_CHARS && trimmed.length <= MAX_CHARS && !mutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (trimmed.length < MIN_CHARS) { setError(`Describe los cambios con al menos ${MIN_CHARS} caracteres.`); return; }
    mutation.mutate({ documentTypeId: documentType.id, description: trimmed, images });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="change-request-title">
      <div className="absolute inset-0 bg-gray-900/50" onClick={() => !mutation.isPending && onClose()}/>

      <form onSubmit={handleSubmit}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white shadow-xl rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 p-5 bg-white border-b border-gray-200">
          <div>
            <h2 id="change-request-title" className="text-lg font-bold text-gray-900">Solicitar cambios</h2>
            <p className="mt-0.5 text-sm text-gray-600">{documentType.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Cerrar">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600">
            Cuéntanos qué cláusula o dato quieres modificar y cómo debería quedar. Cuentas por Pagar
            revisará tu solicitud y te enviará por correo la versión ajustada.
          </p>

          <div>
            <label htmlFor="cr-description" className="block mb-2 text-sm font-bold text-gray-900">
              ¿Qué necesitas cambiar? <span className="text-red-500">*</span>
            </label>
            <textarea id="cr-description" ref={textareaRef} rows={6}
              value={description} maxLength={MAX_CHARS}
              onChange={(e) => { setDescription(e.target.value); setError(''); }}
              placeholder="Ejemplo: en la cláusula 5 el plazo de pago dice 30 días; nuestro acuerdo con Compras fue de 45 días."
              className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            <p className={`mt-1 text-xs text-right ${trimmed.length > 0 && trimmed.length < MIN_CHARS ? 'text-amber-600' : 'text-gray-400'}`}>
              {description.length} / {MAX_CHARS}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm font-bold text-gray-900">Imágenes de referencia</p>
            <p className="mb-3 text-xs text-gray-500">
              Opcional. Capturas del convenio marcando lo que quieres cambiar. Hasta {MAX_IMAGES} imágenes JPG, PNG o WEBP de máximo 5 MB.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {previews.map((p, idx) => (
                <div key={p.url} className="relative overflow-hidden border-2 border-gray-200 rounded-lg aspect-square group">
                  <img src={p.url} alt={p.file.name} className="object-cover w-full h-full"/>
                  <button type="button" onClick={() => removeImage(idx)}
                    className="absolute p-1 text-white rounded-md top-1 right-1 bg-gray-900/70 hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Quitar ${p.file.name}`}>
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors border-2 border-gray-300 border-dashed rounded-lg aspect-square hover:border-primary-400 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  <ImagePlus className="w-6 h-6"/>
                  <span className="text-xs font-medium">Agregar</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={(e) => handleAddImages(e.target.files)}/>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 border-2 border-red-200 rounded-xl bg-red-50" role="alert">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 p-5 bg-white border-t border-gray-200 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button type="submit" variant="primary" leftIcon={<Send className="w-4 h-4"/>}
            disabled={!canSend} loading={mutation.isPending}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </div>
  );
};
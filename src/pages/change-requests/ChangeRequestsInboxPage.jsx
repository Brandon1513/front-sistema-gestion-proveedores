import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Search, X, Download, Upload, File, ImageOff,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, Hourglass, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { changeRequestService } from '../../api/changeRequestService';
import { showToast } from '../../utils/toast';

const STATUS_TABS = [
  { key: 'pending',  label: 'Pendientes' },
  { key: 'attended', label: 'Atendidas' },
  { key: 'rejected', label: 'No procedentes' },
  { key: 'all',      label: 'Todas' },
];

const STATUS_META = {
  pending:  { label: 'Pendiente',     className: 'bg-amber-100 text-amber-800 border-amber-200',       Icon: Hourglass },
  attended: { label: 'Atendida',      className: 'bg-emerald-100 text-emerald-800 border-emerald-200', Icon: CheckCircle },
  rejected: { label: 'No procedente', className: 'bg-gray-100 text-gray-700 border-gray-200',          Icon: XCircle },
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold border rounded-full ${meta.className}`}>
      <Icon className="w-3 h-3"/>{meta.label}
    </span>
  );
};

// Imagen protegida: se pide con el token y se muestra como object URL
const AuthImage = ({ requestId, image, onOpen }) => {
  const [src, setSrc]       = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url = null;
    let cancelled = false;
    changeRequestService.fetchImageBlob(requestId, image.id)
      .then(blob => { if (!cancelled) { url = URL.createObjectURL(blob); setSrc(url); } })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [requestId, image.id]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-gray-400 border-2 border-gray-200 rounded-lg aspect-square bg-gray-50">
        <ImageOff className="w-5 h-5"/><span className="text-[11px]">No disponible</span>
      </div>
    );
  }
  if (!src) return <div className="bg-gray-100 border-2 border-gray-200 rounded-lg aspect-square animate-pulse"/>;

  return (
    <button type="button" onClick={() => onOpen(src, image.original_filename)}
      className="overflow-hidden border-2 border-gray-200 rounded-lg aspect-square hover:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      title={image.original_filename}>
      <img src={src} alt={image.original_filename} className="object-cover w-full h-full"/>
    </button>
  );
};

// ─── Panel de detalle + resolución ───────────────────────────────────────────
const DetailPanel = ({ id, onClose }) => {
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState('attended');
  const [file, setFile]             = useState(null);
  const [notes, setNotes]           = useState('');
  const [error, setError]           = useState('');
  const [lightbox, setLightbox]     = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['change-request', id],
    queryFn: () => changeRequestService.show(id),
  });
  const cr = data?.change_request;

  useEffect(() => { setResolution('attended'); setFile(null); setNotes(''); setError(''); }, [id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      lightbox ? setLightbox(null) : onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, onClose]);

  const mutation = useMutation({
    mutationFn: () => changeRequestService.resolve(id, { resolution, file, notes: notes.trim() }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['change-request', id], exact: false });
      showToast.success(res?.message || 'Solicitud atendida');
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      const first  = errors ? Object.values(errors).flat()[0] : null;
      const msg    = first || err.response?.data?.message || 'No se pudo guardar la respuesta.';
      setError(msg);
      if (err.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['change-request', id], exact: false });
        queryClient.invalidateQueries({ queryKey: ['change-requests'], exact: false });
      }
    },
  });

  const handleFile = (f) => {
    setError('');
    if (!f) return;
    const ok = /\.(docx?|pdf)$/i.test(f.name);
    if (!ok) { setError('La versión ajustada debe ser Word o PDF.'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('El archivo puede pesar máximo 10 MB.'); return; }
    setFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (resolution === 'attended' && !file)        { setError('Sube la versión ajustada del convenio.'); return; }
    if (resolution === 'rejected' && !notes.trim()) { setError('Explica al proveedor por qué no proceden los cambios.'); return; }
    mutation.mutate();
  };

  const handleDownloadResponse = async () => {
    try { await changeRequestService.downloadResponseFile(cr.id, cr.response_filename); }
    catch { showToast.error('No se pudo descargar el archivo'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cr-detail-title">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose}/>
      <aside className="relative flex flex-col w-full h-full max-w-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200">
          <div className="min-w-0">
            <h2 id="cr-detail-title" className="text-lg font-bold text-gray-900 truncate">
              {cr?.provider?.business_name || 'Solicitud de cambios'}
            </h2>
            {cr && (
              <p className="mt-0.5 text-sm text-gray-600">
                {cr.document_type?.name}{cr.provider?.rfc ? ` · ${cr.provider.rfc}` : ''}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
          {isLoading && <p className="text-sm text-gray-500">Cargando solicitud...</p>}
          {isError && <p className="text-sm text-red-600">No se pudo cargar la solicitud.</p>}

          {cr && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <StatusBadge status={cr.status}/>
                <span>Solicitada el {formatDateTime(cr.created_at)}</span>
                {cr.provider?.email && <span>{cr.provider.email}</span>}
              </div>

              <section>
                <h3 className="mb-2 text-sm font-bold text-gray-900">Lo que pide el proveedor</h3>
                <p className="p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-line border-2 border-gray-200 rounded-xl bg-gray-50">
                  {cr.description}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-gray-900">
                  Imágenes de referencia {cr.images?.length ? `(${cr.images.length})` : ''}
                </h3>
                {cr.images?.length ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {cr.images.map(img => (
                      <AuthImage key={img.id} requestId={cr.id} image={img}
                        onOpen={(src, name) => setLightbox({ src, name })}/>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">El proveedor no adjuntó imágenes.</p>
                )}
              </section>

              {cr.status === 'pending' ? (
                <form onSubmit={handleSubmit} className="p-5 space-y-4 border-2 border-gray-200 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-900">Responder</h3>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: 'attended', title: 'Enviar versión ajustada', hint: 'Sube el Word corregido para este proveedor.' },
                      { key: 'rejected', title: 'No procede',               hint: 'Se queda la plantilla base y le explicas el motivo.' },
                    ].map(opt => (
                      <label key={opt.key}
                        className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                          resolution === opt.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <input type="radio" name="resolution" value={opt.key}
                          checked={resolution === opt.key}
                          onChange={() => { setResolution(opt.key); setError(''); }}
                          className="mt-1 text-primary-600 focus:ring-primary-500"/>
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{opt.title}</span>
                          <span className="block mt-0.5 text-xs text-gray-600">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {resolution === 'attended' && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Versión ajustada <span className="text-red-500">*</span>
                      </label>
                      {file ? (
                        <div className="flex items-center justify-between gap-3 p-3 border-2 border-green-200 rounded-xl bg-green-50">
                          <span className="flex items-center min-w-0 gap-2 text-sm font-medium text-gray-900">
                            <File className="flex-shrink-0 w-4 h-4 text-green-700"/>
                            <span className="truncate">{file.name}</span>
                          </span>
                          <button type="button" onClick={() => setFile(null)} aria-label="Quitar archivo"
                            className="p-1 text-red-600 rounded-lg hover:bg-red-50"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-1 p-5 text-center border-2 border-gray-300 border-dashed cursor-pointer rounded-xl hover:border-primary-400">
                          <Upload className="w-6 h-6 text-primary-600"/>
                          <span className="text-sm font-semibold text-gray-900">Selecciona el archivo</span>
                          <span className="text-xs text-gray-500">Word o PDF, máximo 10 MB. El proveedor lo descargará con este nombre.</span>
                          <input type="file" accept=".doc,.docx,.pdf" className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}/>
                        </label>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="cr-notes" className="block mb-2 text-sm font-semibold text-gray-700">
                      {resolution === 'rejected' ? <>Motivo <span className="text-red-500">*</span></> : 'Comentarios para el proveedor (opcional)'}
                    </label>
                    <textarea id="cr-notes" rows={4} maxLength={3000} value={notes}
                      onChange={(e) => { setNotes(e.target.value); setError(''); }}
                      placeholder={resolution === 'rejected'
                        ? 'Ejemplo: el plazo de pago de 30 días es política general y no se modifica por proveedor.'
                        : 'Ejemplo: se ajustó el plazo de pago a 45 días en la cláusula 5.'}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
                    <p className="mt-1 text-xs text-gray-500">El proveedor verá este texto en el correo y en el portal.</p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 border-2 border-red-200 rounded-xl bg-red-50" role="alert">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <Button type="submit" variant="primary" loading={mutation.isPending} className="w-full"
                    leftIcon={resolution === 'attended' ? <Upload className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}>
                    {resolution === 'attended' ? 'Enviar versión ajustada' : 'Marcar como no procedente'}
                  </Button>
                </form>
              ) : (
                <section className="p-5 space-y-3 border-2 border-gray-200 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-900">Respuesta</h3>
                  <p className="text-xs text-gray-600">
                    {cr.attended_by?.name ? `${cr.attended_by.name} · ` : ''}{formatDateTime(cr.attended_at)}
                  </p>
                  {cr.response_notes && (
                    <p className="text-sm text-gray-800 whitespace-pre-line">{cr.response_notes}</p>
                  )}
                  {cr.has_response_file && (
                    <button type="button" onClick={handleDownloadResponse}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                      <Download className="w-4 h-4"/>Descargar: {cr.response_filename}
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </aside>

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90" onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} aria-label="Cerrar imagen"
            className="absolute p-2 text-white rounded-lg top-4 right-4 hover:bg-white/10"><X className="w-6 h-6"/></button>
          <img src={lightbox.src} alt={lightbox.name} className="object-contain max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────
export const ChangeRequestsInboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus]       = useState('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);

  // El correo trae ?id= para abrir directo la solicitud
  const openId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const openDetail  = (id) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('id', id); return p; });
  const closeDetail = () => setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('id'); return p; });

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['change-requests', status, search, page],
    queryFn: () => changeRequestService.list({ status, search: search || undefined, page }),
    placeholderData: (prev) => prev,
  });

  const rows   = data?.data || [];
  const counts = data?.counts || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <MessageSquare className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitudes de cambio a convenios</h1>
            <p className="text-sm text-gray-600">Revisa lo que piden los proveedores y envíales su versión ajustada</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} type="button" role="tab" aria-selected={status === tab.key}
              onClick={() => { setStatus(tab.key); setPage(1); }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                status === tab.key ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
              <span className={`px-1.5 text-xs rounded-md ${status === tab.key ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2"/>
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por proveedor, RFC o correo"
            className="w-full py-2 pr-3 text-sm bg-white border-2 border-gray-300 pl-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
        </div>
      </div>

      <div className={`bg-white border-2 border-gray-200 rounded-xl divide-y divide-gray-100 ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        {isLoading && <p className="p-6 text-sm text-gray-500">Cargando solicitudes...</p>}
        {isError && <p className="p-6 text-sm text-red-600">No se pudieron cargar las solicitudes. Recarga la página.</p>}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="p-10 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300"/>
            <p className="text-sm font-semibold text-gray-700">
              {search ? 'Ninguna solicitud coincide con la búsqueda.' : status === 'pending' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes en esta vista.'}
            </p>
          </div>
        )}

        {rows.map(cr => (
          <button key={cr.id} type="button" onClick={() => openDetail(cr.id)}
            className="flex flex-col w-full gap-2 p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-primary-50 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900 truncate">{cr.provider?.business_name || 'Proveedor'}</p>
                <StatusBadge status={cr.status}/>
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                {cr.document_type?.name}{cr.provider?.rfc ? ` · ${cr.provider.rfc}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-700 line-clamp-1">{cr.description}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 sm:flex-col sm:items-end sm:gap-1">
              <span>{formatDateTime(cr.created_at)}</span>
              {cr.images_count > 0 && (
                <span className="inline-flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5"/>{cr.images_count}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {data?.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Página {data.current_page} de {data.last_page}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4"/>}>Anterior</Button>
            <Button type="button" variant="ghost" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="inline w-4 h-4"/>
            </Button>
          </div>
        </div>
      )}

      {openId && <DetailPanel id={openId} onClose={closeDetail}/>}
    </div>
  );
};

export default ChangeRequestsInboxPage;
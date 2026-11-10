import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nonConformityService } from '../../api/nonConformityService';
import { providerService } from '../../api/providerService';
import { appointmentService } from '../../api/appointmentService';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { RichTextView } from '../../components/common/RichTextView';
import { showToast } from '../../utils/toast';
import {
  NC_STATUS_STYLES, NcStatusBadge, NcDueInfo, NcPhotoThumb, NcField, NcTimeline, NcRoundsHistory, fmtDate, fmtQuantity,
  EvidenceBadge, EvidenceAttempt, NcEvidenceProgress,
} from '../../components/non-conformities/NcShared';
import { NcIndicators } from '../../components/non-conformities/NcIndicators';
import {
  FileWarning, Plus, X, Search, Filter, RotateCcw, Camera, Edit3, Trash2,
  AlertCircle, Lock, Building2, Package, Calendar, Info, ClipboardList, CheckCircle, XCircle, ShieldCheck, ChevronDown, ChevronUp, FileDown, List, BarChart3,
} from 'lucide-react';

const MAX_PHOTOS = 6; // igual que NonConformity::MAX_PHOTOS
const CURRENT_YEAR = new Date().getFullYear();
const QUERY_KEY = 'non-conformities';

const EMPTY_FORM = {
  provider_id: '', product_service_id: '', lot: '', deviation_date: new Date().toLocaleDateString('en-CA'),
  reception_date: '', quantity_involved: '', unit_id: '', non_conformity_type_id: '', description: '',
  immediate_action: '', immediate_action_date: '',
};

const inputCls = 'w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400';
const labelCls = 'block mb-1.5 text-xs font-semibold text-gray-600';

// ─── Selector de fotos (alta) ─────────────────────────────────────────────────
const PhotoPicker = ({ files, onChange, max }) => {
  const inputRef = useRef(null);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);
  const left = max - files.length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative w-24 h-24 overflow-hidden border-2 border-gray-200 rounded-lg">
            <img src={src} alt="Vista previa" className="object-cover w-full h-full"/>
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute flex items-center justify-center w-5 h-5 text-white rounded-full top-1 right-1 bg-black/60 hover:bg-red-600"><X className="w-3 h-3"/></button>
          </div>
        ))}
        {left > 0 && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center w-24 h-24 text-xs text-gray-400 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 hover:text-primary-600">
            <Camera className="w-5 h-5 mb-0.5"/>Agregar
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={e => { const n = Array.from(e.target.files || []); e.target.value = ''; onChange([...files, ...n].slice(0, max)); }}/>
    </div>
  );
};

// ─── Fotos guardadas (edición) ────────────────────────────────────────────────
const SavedPhotos = ({ nc, onChanged }) => {
  const [photos, setPhotos] = useState(nc.photos || []);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const left = MAX_PHOTOS - photos.length;

  const handleAdd = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, left);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const res = await nonConformityService.uploadPhotos(nc.id, files);
      setPhotos(res.photos || []); onChanged?.();
      showToast.success('Fotos guardadas');
    } catch (err) { showToast.error(err.response?.data?.message || 'No se pudieron subir las fotos'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    try {
      await nonConformityService.deletePhoto(photoId);
      setPhotos(p => p.filter(x => x.id !== photoId)); onChanged?.();
    } catch (err) { showToast.error(err.response?.data?.message || 'No se pudo eliminar la foto'); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {photos.map(p => <NcPhotoThumb key={p.id} photoId={p.id} onDelete={() => handleDelete(p.id)}/>)}
      {left > 0 && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="flex flex-col items-center justify-center w-24 h-24 text-xs text-gray-400 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 hover:text-primary-600 disabled:opacity-50">
          {busy ? <div className="w-5 h-5 border-2 rounded-full border-t-primary-500 animate-spin"/> : <><Camera className="w-5 h-5 mb-0.5"/>Agregar</>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleAdd}/>
    </div>
  );
};

// ─── Modal de alta / edición (Sección 1) ──────────────────────────────────────
const NcFormModal = ({ nc, types, providers, units, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit = !!nc;
  const [form, setForm] = useState(() => isEdit ? {
    provider_id:            String(nc.provider?.id || ''),
    product_service_id:     String(nc.product?.id || ''),
    lot:                    nc.lot || '',
    deviation_date:         nc.deviation_date || '',
    reception_date:         nc.reception_date || '',
    quantity_involved:      nc.quantity_involved ?? '',
    unit_id:                String(nc.unit?.id || ''),
    non_conformity_type_id: String(nc.type?.id || ''),
    description:            nc.description || '',
    immediate_action:       nc.immediate_action || '',
    immediate_action_date:  nc.immediate_action_date || '',
  } : EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v, ...(k === 'provider_id' ? { product_service_id: '' } : {}) }));

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['nc-provider-products', form.provider_id],
    queryFn: () => nonConformityService.getProviderProducts(form.provider_id),
    enabled: !!form.provider_id,
  });
  const products = productsData?.products || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });

  const mutation = useMutation({
    mutationFn: () => isEdit ? nonConformityService.update(nc.id, form) : nonConformityService.create(form, photos),
    onSuccess: (res) => { invalidate(); showToast.success(res.message || 'Guardado'); onClose(); },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.provider_id)            return setError('Selecciona el proveedor');
    if (!form.product_service_id)     return setError('Selecciona el producto');
    if (!form.deviation_date)         return setError('Indica la fecha de la desviación');
    if (!form.non_conformity_type_id) return setError('Selecciona el tipo de desviación');
    if (!form.description.replace(/<[^>]*>/g, '').trim()) return setError('Describe la No Conformidad');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary"><FileWarning className="w-5 h-5 text-white"/></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? `Editar ${nc.folio}` : 'Nueva No Conformidad'}</h2>
              <p className="text-xs text-gray-500">Primera sección — a llenar por DASAVENA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div className="flex items-start gap-2 p-3 border border-blue-200 rounded-xl bg-blue-50">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-blue-700">Al emitirla se genera el folio y se envía un correo al proveedor. Desde ese momento corren sus 28 días para responder.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}><Building2 className="inline w-3.5 h-3.5 mr-1"/>Proveedor *</label>
              <select value={form.provider_id} onChange={e => set('provider_id', e.target.value)} className={inputCls}>
                <option value="">Selecciona un proveedor...</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}><Package className="inline w-3.5 h-3.5 mr-1"/>Producto *</label>
              <select value={form.product_service_id} onChange={e => set('product_service_id', e.target.value)} className={inputCls}
                disabled={!form.provider_id || productsLoading}>
                <option value="">{!form.provider_id ? 'Primero selecciona el proveedor' : productsLoading ? 'Cargando productos...' : 'Selecciona un producto...'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {form.provider_id && !productsLoading && products.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">Este proveedor no tiene productos asignados en el catálogo.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Lote</label>
              <input value={form.lot} onChange={e => set('lot', e.target.value)} maxLength={100} className={inputCls} placeholder="Ej. NUT 3230 75126"/>
            </div>
            <div>
              <label className={labelCls}>Tipo de desviación *</label>
              <select value={form.non_conformity_type_id} onChange={e => set('non_conformity_type_id', e.target.value)} className={inputCls}>
                <option value="">Selecciona...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}><Calendar className="inline w-3.5 h-3.5 mr-1"/>Fecha de desviación *</label>
              <input type="date" value={form.deviation_date} max={new Date().toLocaleDateString('en-CA')} onChange={e => set('deviation_date', e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}><Calendar className="inline w-3.5 h-3.5 mr-1"/>Fecha de recepción</label>
              <input type="date" value={form.reception_date} max={new Date().toLocaleDateString('en-CA')} onChange={e => set('reception_date', e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Cantidad involucrada</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.quantity_involved} onChange={e => set('quantity_involved', e.target.value)} className={inputCls} placeholder="0"/>
                <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)} className="w-28 px-2 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400">
                  <option value="">Unidad</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción de la No Conformidad *</label>
            <RichTextEditor value={form.description} onChange={v => set('description', v)} minHeight="min-h-[140px]"
              placeholder="Describe el hallazgo, dónde y cómo se detectó, y el riesgo que representa..."/>
          </div>

          <div>
            <label className={labelCls}><Camera className="inline w-3.5 h-3.5 mr-1"/>Fotos <span className="font-normal text-gray-400">(máx. {MAX_PHOTOS} — las verá el proveedor)</span></label>
            {isEdit
              ? <SavedPhotos nc={nc} onChanged={() => queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false })}/>
              : <PhotoPicker files={photos} onChange={setPhotos} max={MAX_PHOTOS}/>}
          </div>

          <div className="p-4 space-y-3 border-2 border-gray-200 rounded-xl bg-gray-50">
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-600"><Lock className="w-3.5 h-3.5"/>Acción inmediata de DASAVENA <span className="font-normal text-gray-400">(seguimiento interno, no la ve el proveedor)</span></p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)} maxLength={500}
                className={`${inputCls} sm:col-span-2 bg-white`} placeholder="Ej. Devolución a proveedor, segregación, PPRO..."/>
              <input type="date" value={form.immediate_action_date} onChange={e => set('immediate_action_date', e.target.value)} className={`${inputCls} bg-white`}/>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/><p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1">{isEdit ? 'Guardar cambios' : 'Emitir No Conformidad'}</Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Revisión de la Sección 2 (ingeniero) ─────────────────────────────────────
const ReviewPanel = ({ nc, response }) => {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (decision) => nonConformityService.reviewResponse(nc.id, response.id, { decision, comment: comment.trim() || undefined }),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false }); showToast.success(res.message); },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar la revisión'));
    },
  });

  const submit = (decision) => {
    setError('');
    if (decision === 'return' && !comment.trim()) return setError('Escribe al proveedor qué debe corregir');
    const msg = decision === 'accept'
      ? `¿Aceptar el plan de acción de la vuelta ${response.round}? El proveedor pasará a entregar sus evidencias.`
      : `¿Regresar la vuelta ${response.round} al proveedor? Los plazos no se reinician.`;
    if (window.confirm(msg)) mutation.mutate(decision);
  };

  return (
    <div className="p-4 space-y-3 border-2 border-blue-200 rounded-xl bg-blue-50/50">
      <p className="text-sm font-bold text-blue-900">Revisar la vuelta {response.round}</p>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={5000}
        placeholder="Comentarios para el proveedor (obligatorio si se regresa)..."
        className="w-full px-3 py-2 text-sm bg-white border-2 border-blue-200 resize-none rounded-xl focus:outline-none focus:border-blue-400"/>
      {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5"/>{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={mutation.isPending && mutation.variables === 'accept'} disabled={mutation.isPending}
          onClick={() => submit('accept')} leftIcon={<CheckCircle className="w-4 h-4"/>}
          className="text-white bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600">
          Aceptar plan
        </Button>
        <Button size="sm" variant="secondary" loading={mutation.isPending && mutation.variables === 'return'} disabled={mutation.isPending}
          onClick={() => submit('return')} leftIcon={<RotateCcw className="w-4 h-4"/>}>
          Regresar al proveedor
        </Button>
      </div>
    </div>
  );
};

// ─── Botón de descarga del PDF ────────────────────────────────────────────────
const PdfButton = ({ onClick }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button size="sm" variant="secondary" loading={loading} leftIcon={<FileDown className="w-4 h-4"/>}
      onClick={async () => {
        setLoading(true);
        try { await onClick(); } catch { showToast.error('No se pudo generar el PDF'); } finally { setLoading(false); }
      }}>
      Descargar F-CAL-24
    </Button>
  );
};

// ─── Sección 3: validación de una evidencia ───────────────────────────────────
const downloadEvidence = (e) =>
  nonConformityService.downloadEvidence(e.id, e.original_name).catch(() => showToast.error('No se pudo descargar la evidencia'));

const ActionEvidenceReview = ({ nc, action, canReview }) => {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [latest, ...previous] = action.evidences || [];

  const mutation = useMutation({
    mutationFn: (decision) => nonConformityService.reviewEvidence(nc.id, latest.id, { decision, comment: comment.trim() || undefined }),
    onSuccess: (res) => { setComment(''); queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false }); showToast.success(res.message); },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });

  const submit = (decision) => {
    setError('');
    if (decision === 'reject' && !comment.trim()) return setError('Indica al proveedor por qué no cumple');
    mutation.mutate(decision);
  };

  return (
    <div className="p-3 space-y-2 border-2 border-gray-200 rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary-700">Acción {action.sort_order}</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{action.action}</p>
          <p className="mt-0.5 text-xs text-gray-500"><span className="font-semibold">Evidencia a entregar:</span> {action.evidence_to_deliver}</p>
        </div>
        <EvidenceBadge status={action.evidence_status}/>
      </div>

      {latest ? <EvidenceAttempt evidence={latest} onDownload={downloadEvidence}/> : (
        <p className="text-xs italic text-gray-400">El proveedor aún no sube la evidencia de esta acción.</p>
      )}

      {canReview && latest?.review_status === 'pending' && (
        <div className="p-2.5 space-y-2 rounded-lg bg-blue-50/60 border border-blue-200">
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={2000}
            placeholder="Comentario (obligatorio si no cumple)..."
            className="w-full px-3 py-2 text-sm bg-white border-2 border-blue-200 resize-none rounded-xl focus:outline-none focus:border-blue-400"/>
          {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5"/>{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={mutation.isPending} loading={mutation.isPending && mutation.variables === 'accept'}
              onClick={() => submit('accept')} leftIcon={<CheckCircle className="w-4 h-4"/>}
              className="text-white bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600">Cumple</Button>
            <Button size="sm" variant="danger" disabled={mutation.isPending} loading={mutation.isPending && mutation.variables === 'reject'}
              onClick={() => submit('reject')} leftIcon={<XCircle className="w-4 h-4"/>}>No cumple</Button>
          </div>
        </div>
      )}

      {previous.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory(v => !v)} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
            {showHistory ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
            Intentos anteriores ({previous.length})
          </button>
          {showHistory && <div className="mt-2 space-y-2">{previous.map(e => <EvidenceAttempt key={e.id} evidence={e} onDownload={downloadEvidence}/>)}</div>}
        </div>
      )}
    </div>
  );
};

// ─── Cierre de la NC ──────────────────────────────────────────────────────────
const ClosePanel = ({ nc }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => nonConformityService.close(nc.id, comment.trim()),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false }); showToast.success(res.message); },
    onError: (err) => showToast.error(err.response?.data?.message || 'No se pudo cerrar'),
  });

  return (
    <div className="p-4 space-y-3 border-2 border-teal-300 rounded-xl bg-teal-50/60">
      <p className="flex items-center gap-1 text-sm font-bold text-teal-900"><ShieldCheck className="w-4 h-4"/>Todas las evidencias cumplen · listo para cerrar</p>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={5000}
        placeholder="Comentario de cierre (opcional)..."
        className="w-full px-3 py-2 text-sm bg-white border-2 border-teal-200 resize-none rounded-xl focus:outline-none focus:border-teal-400"/>
      <p className="text-[11px] text-teal-800">Firma electrónica del emisor en señal de cierre: <strong>{user?.name}</strong> · {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <Button loading={mutation.isPending} leftIcon={<ShieldCheck className="w-4 h-4"/>}
        onClick={() => { if (window.confirm(`¿Cerrar la No Conformidad ${nc.folio}? Esta acción queda firmada con su usuario y no se puede deshacer.`)) mutation.mutate(); }}
        className="text-white bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700">
        Cerrar No Conformidad
      </Button>
    </div>
  );
};

// ─── Modal de detalle ─────────────────────────────────────────────────────────
const NcDetailModal = ({ ncId, canEdit, onClose, onEdit }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [QUERY_KEY, 'detail', ncId], queryFn: () => nonConformityService.getById(ncId) });
  const nc = data?.non_conformity;

  const deleteMutation = useMutation({
    mutationFn: () => nonConformityService.remove(ncId),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false }); showToast.success(res.message); onClose(); },
    onError: (err) => showToast.error(err.response?.data?.message || 'No se pudo eliminar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg shadow-md bg-gradient-primary"><FileWarning className="w-5 h-5 text-white"/></div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{nc?.folio || 'No Conformidad'}</h2>
              {nc && <p className="text-xs text-gray-500 truncate">{nc.provider?.business_name} · {nc.type?.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nc && <NcStatusBadge status={nc.display_status}/>}
            <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
          </div>
        </div>

        {isLoading || !nc ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 rounded-full border-t-primary-500 animate-spin"/></div>
        ) : (
          <div className="p-6 space-y-5">
            <NcTimeline nc={nc}/>

            <div>
              <p className="mb-2 text-xs font-bold tracking-wide uppercase text-primary-700">Primera sección (DASAVENA)</p>
              <div className="p-3 border border-gray-200 rounded-xl">
                <NcField label="Folio">{nc.folio}</NcField>
                <NcField label="Fecha de desviación">{fmtDate(nc.deviation_date)}</NcField>
                <NcField label="Proveedor">{nc.provider?.business_name}</NcField>
                <NcField label="Producto">{nc.product?.name}</NcField>
                <NcField label="Lote">{nc.lot}</NcField>
                <NcField label="Fecha de recepción">{nc.reception_date ? fmtDate(nc.reception_date) : null}</NcField>
                <NcField label="Cantidad involucrada">{fmtQuantity(nc)}</NcField>
                <NcField label="Tipo de desviación">{nc.type?.name}</NcField>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-gray-600">Descripción de la No Conformidad</p>
              <div className="p-3 border border-gray-200 rounded-xl bg-gray-50"><RichTextView value={nc.description}/></div>
            </div>

            {nc.photos?.length > 0 && (
              <div>
                <p className="flex items-center gap-1 mb-2 text-xs font-semibold text-gray-600"><Camera className="w-3.5 h-3.5"/>Fotos</p>
                <div className="flex flex-wrap gap-2">{nc.photos.map(p => <NcPhotoThumb key={p.id} photoId={p.id}/>)}</div>
              </div>
            )}

            {(nc.immediate_action || nc.immediate_action_date) && (
              <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                <p className="flex items-center gap-1 mb-1 text-xs font-semibold text-gray-500"><Lock className="w-3 h-3"/>Acción inmediata (interna)</p>
                <p className="text-sm text-gray-800">{nc.immediate_action || '—'}{nc.immediate_action_date && <span className="text-gray-500"> · {fmtDate(nc.immediate_action_date)}</span>}</p>
              </div>
            )}

            {/* ── Segunda sección (proveedor) ── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1 text-xs font-bold tracking-wide uppercase text-primary-700"><ClipboardList className="w-3.5 h-3.5"/>Segunda sección (proveedor)</p>
                <span className="text-xs font-semibold text-gray-500">{nc.stage_label}</span>
              </div>
              {nc.responses?.length > 0 ? (
                <>
                  {canEdit && nc.responses[0].review_status === 'pending' && <ReviewPanel nc={nc} response={nc.responses[0]}/>}
                  <NcRoundsHistory responses={nc.responses}/>
                </>
              ) : (
                <div className="p-3 border-2 border-gray-200 border-dashed rounded-xl">
                  <p className="text-xs text-gray-500">El proveedor aún no envía su análisis de causa raíz y acciones correctivas.</p>
                </div>
              )}
            </div>

            {/* ── Tercera sección (DASAVENA) ── */}
            {nc.accepted_response_id && (() => {
              const accepted = nc.responses?.find(r => r.id === nc.accepted_response_id);
              if (!accepted) return null;
              return (
                <div className="space-y-3">
                  <p className="flex items-center gap-1 text-xs font-bold tracking-wide uppercase text-primary-700"><ShieldCheck className="w-3.5 h-3.5"/>Tercera sección (evidencias) · vuelta {accepted.round}</p>
                  <NcEvidenceProgress progress={nc.evidence_progress}/>
                  {accepted.actions.map(a => (
                    <ActionEvidenceReview key={a.id} nc={nc} action={a} canReview={canEdit && nc.status === 'awaiting_evidence'}/>
                  ))}
                  {canEdit && nc.can_close && <ClosePanel nc={nc}/>}
                  {nc.closed_at && (
                    <div className="p-3 border-2 border-teal-200 rounded-xl bg-teal-50">
                      <p className="flex items-center gap-1 text-xs font-bold text-teal-800"><ShieldCheck className="w-3.5 h-3.5"/>Firma electrónica del emisor en señal de cierre</p>
                      <p className="mt-1 text-sm text-teal-900"><strong>{nc.closed_by}</strong> · {nc.closed_at}</p>
                      {nc.closing_comment && <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{nc.closing_comment}</p>}
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="text-xs text-gray-400">Emitida por {nc.created_by || '—'} el {fmtDate(nc.issued_at)}</p>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              <PdfButton onClick={() => nonConformityService.downloadPdf(nc.id, nc.folio)}/>
              {canEdit && nc.is_editable && (
                <>
                  <Button variant="secondary" size="sm" leftIcon={<Edit3 className="w-4 h-4"/>} onClick={() => onEdit(nc)}>Editar</Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4"/>} loading={deleteMutation.isPending}
                    onClick={() => { if (window.confirm(`¿Eliminar la No Conformidad ${nc.folio}? El folio no se reutiliza.`)) deleteMutation.mutate(); }}>
                    Eliminar
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Página ───────────────────────────────────────────────────────────────────
export const NonConformitiesPage = () => {
  const user = useAuthStore(s => s.user);
  const roles = (user?.roles || []).map(r => (r?.name || r)?.toLowerCase());
  const canEdit = roles.some(r => ['super_admin', 'admin', 'ingeniero_alimentos'].includes(r));
  // Indicadores: solo super administrador, ingeniero de alimentos y compras
  const canSeeIndicators = roles.some(r => ['super_admin', 'ingeniero_alimentos', 'compras'].includes(r));
  const [tab, setTab] = useState('list');

  const [filters, setFilters] = useState({ provider_id: '', type_id: '', display_status: '', year: String(CURRENT_YEAR), search: '' });
  const [detailId, setDetailId] = useState(null);
  const [formNc, setFormNc] = useState(undefined); // undefined = cerrado, null = nueva, objeto = editar

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, isLoading } = useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => nonConformityService.getAll(params) });
  const { data: typesData } = useQuery({ queryKey: ['nc-types'], queryFn: nonConformityService.getTypes, staleTime: 10 * 60 * 1000 });
  const { data: providersData } = useQuery({ queryKey: ['providers-select'], queryFn: () => providerService.getAll({ per_page: 200 }), staleTime: 5 * 60 * 1000 });
  const { data: unitsData } = useQuery({ queryKey: ['units'], queryFn: appointmentService.getUnits, staleTime: 10 * 60 * 1000, enabled: canEdit });

  const items     = data?.non_conformities || [];
  const counts    = data?.counts || {};
  const types     = typesData?.types || [];
  const statuses  = typesData?.display_statuses || Object.keys(NC_STATUS_STYLES);
  const providers = providersData?.data || providersData?.providers || [];
  const units     = unitsData?.units || [];

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const hasFilters = filters.provider_id || filters.type_id || filters.display_status || filters.search || filters.year !== String(CURRENT_YEAR);
  const years = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><FileWarning className="w-6 h-6 text-white"/></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">No Conformidades</h1>
            <p className="text-sm text-gray-600">No Conformidades a proveedor · F-CAL-24</p>
          </div>
        </div>
        {canEdit && <Button onClick={() => setFormNc(null)} leftIcon={<Plus className="w-4 h-4"/>}>Nueva No Conformidad</Button>}
      </div>

      {canSeeIndicators && (
        <div className="flex gap-2 p-1 bg-white border-2 border-gray-200 rounded-xl w-fit">
          {[{ key: 'list', label: 'Listado', Icon: List }, { key: 'indicators', label: 'Indicadores', Icon: BarChart3 }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-gradient-primary text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
              <t.Icon className="w-4 h-4"/>{t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'indicators' && canSeeIndicators ? <NcIndicators providers={providers}/> : (<>
      {/* Indicadores por estado (clic para filtrar) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statuses.map(s => {
          const st = NC_STATUS_STYLES[s] || NC_STATUS_STYLES['Sin respuesta'];
          const active = filters.display_status === s;
          return (
            <button key={s} onClick={() => set('display_status', active ? '' : s)}
              className={`p-3 text-left bg-white border-2 rounded-xl transition-all ${st.card} ${active ? 'ring-2 ring-primary-400 shadow-md' : 'hover:shadow-sm'}`}>
              <p className="text-[11px] font-semibold leading-tight text-gray-500">{s}</p>
              <p className={`mt-1 text-2xl font-bold ${st.value}`}>{counts[s] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="p-4 space-y-3 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500"/><h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          {hasFilters && (
            <button onClick={() => setFilters({ provider_id: '', type_id: '', display_status: '', year: String(CURRENT_YEAR), search: '' })}
              className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-500 hover:text-gray-700"><RotateCcw className="w-3 h-3"/>Limpiar</button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
            <input value={filters.search} onChange={e => set('search', e.target.value)} placeholder="Folio, lote o descripción..." className={`${inputCls} pl-9`}/>
          </div>
          <select value={filters.provider_id} onChange={e => set('provider_id', e.target.value)} className={inputCls}>
            <option value="">Todos los proveedores</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
          </select>
          <select value={filters.type_id} onChange={e => set('type_id', e.target.value)} className={inputCls}>
            <option value="">Todos los tipos</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.year} onChange={e => set('year', e.target.value)} className={inputCls}>
            <option value="">Todos los años</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 rounded-full border-t-primary-500 animate-spin"/></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <FileWarning className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
            <p className="font-medium text-gray-500">No hay No Conformidades con estos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Folio', 'Desviación', 'Proveedor', 'Producto', 'Tipo', 'Estado', 'Fecha límite'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-bold tracking-wide text-left text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(nc => (
                  <tr key={nc.id} onClick={() => setDetailId(nc.id)} className="cursor-pointer hover:bg-primary-50/40">
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary-700 whitespace-nowrap">{nc.folio}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{fmtDate(nc.deviation_date)}</td>
                    <td className="px-3 py-2.5 min-w-[160px] font-medium text-gray-800">{nc.provider?.business_name}</td>
                    <td className="px-3 py-2.5 min-w-[140px] text-gray-700">{nc.product?.name}{nc.lot && <p className="text-[11px] text-gray-400">Lote {nc.lot}</p>}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{nc.type?.name}</td>
                    <td className="px-3 py-2.5">
                      <NcStatusBadge status={nc.display_status}/>
                      <p className="mt-0.5 text-[11px] text-gray-400 whitespace-nowrap">{nc.stage_label}</p>
                    </td>
                    <td className="px-3 py-2.5"><NcDueInfo nc={nc}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}

      {detailId && (
        <NcDetailModal ncId={detailId} canEdit={canEdit} onClose={() => setDetailId(null)}
          onEdit={(nc) => { setDetailId(null); setFormNc(nc); }}/>
      )}
      {formNc !== undefined && (
        <NcFormModal nc={formNc} types={types} providers={providers} units={units} onClose={() => setFormNc(undefined)}/>
      )}
    </div>
  );
};
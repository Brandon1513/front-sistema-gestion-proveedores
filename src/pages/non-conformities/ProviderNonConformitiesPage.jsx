import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nonConformityService } from '../../api/nonConformityService';
import { Button } from '../../components/common/Button';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { RichTextView } from '../../components/common/RichTextView';
import { showToast } from '../../utils/toast';
import {
  NcStatusBadge, NcDueInfo, NcPhotoThumb, NcField, NcTimeline, NcRoundsHistory, fmtDate, fmtQuantity,
  EvidenceBadge, EvidenceAttempt, NcEvidenceProgress,
} from '../../components/non-conformities/NcShared';
import { FileWarning, X, Camera, AlertTriangle, Info, ChevronRight, Plus, Trash2, Send, AlertCircle, ClipboardList, Hourglass, MessageSquare, Upload, ShieldCheck, ChevronDown, ChevronUp, CheckCircle, FileDown } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400';
const labelCls = 'block mb-1 text-xs font-semibold text-gray-600';
const EMPTY_ACTION = { action: '', responsible: '', commitment_date: '', completion_date: '', evidence_to_deliver: '' };

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

// ─── Sección 3: evidencia de una acción ───────────────────────────────────────
const downloadEvidence = (e) =>
  nonConformityService.downloadEvidence(e.id, e.original_name).catch(() => showToast.error('No se pudo descargar la evidencia'));

const ActionEvidenceUpload = ({ nc, action }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [latest, ...previous] = action.evidences || [];
  const canUpload = nc.status === 'awaiting_evidence' && action.can_upload_evidence;

  const mutation = useMutation({
    mutationFn: () => nonConformityService.uploadEvidence(nc.id, action.id, file, comment.trim()),
    onSuccess: (res) => {
      setFile(null); setComment('');
      queryClient.invalidateQueries({ queryKey: ['provider-non-conformities'], exact: false });
      showToast.success(res.message || 'Evidencia enviada');
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al subir la evidencia'));
    },
  });

  const submit = () => {
    setError('');
    if (!file) return setError('Selecciona el archivo de la evidencia');
    if (file.size > 10 * 1024 * 1024) return setError('El archivo debe pesar menos de 10 MB');
    mutation.mutate();
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

      {latest && <EvidenceAttempt evidence={latest} onDownload={downloadEvidence}/>}

      {canUpload && (
        <div className="p-2.5 space-y-2 border border-dashed rounded-lg border-primary-300 bg-primary-50/40">
          {latest?.review_status === 'rejected' && (
            <p className="text-xs font-semibold text-red-700">Su evidencia anterior no cumplió. Suba una nueva.</p>
          )}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary-700"/>
          <input value={comment} onChange={e => setComment(e.target.value)} maxLength={2000}
            placeholder="Comentario (opcional)" className={inputCls}/>
          <p className="text-[11px] text-gray-500">PDF, imagen, Word o Excel · máx. 10 MB</p>
          {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5"/>{error}</p>}
          <Button size="sm" loading={mutation.isPending} onClick={submit} leftIcon={<Upload className="w-4 h-4"/>}>Enviar evidencia</Button>
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

// ─── Formulario de la Sección 2 ───────────────────────────────────────────────
// Si el plan fue regresado, se precarga con la vuelta anterior para que solo corrija.
const ResponseForm = ({ nc }) => {
  const queryClient = useQueryClient();
  const previous = nc.responses?.[0];
  const [form, setForm] = useState(() => ({
    team_leader: previous?.team_leader || '',
    area:        previous?.area || '',
    root_cause:  previous?.root_cause || '',
    actions:     previous?.actions?.length
      ? previous.actions.map(a => ({
          action: a.action, responsible: a.responsible, commitment_date: a.commitment_date || '',
          completion_date: a.completion_date || '', evidence_to_deliver: a.evidence_to_deliver,
        }))
      : [{ ...EMPTY_ACTION }],
  }));
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAction = (i, k, v) => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { ...a, [k]: v } : a) }));
  const addAction = () => setForm(f => ({ ...f, actions: [...f.actions, { ...EMPTY_ACTION }] }));
  const removeAction = (i) => setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }));

  const mutation = useMutation({
    mutationFn: () => nonConformityService.submitResponse(nc.id, {
      ...form,
      actions: form.actions.map(a => ({ ...a, completion_date: a.completion_date || null })),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['provider-non-conformities'], exact: false });
      showToast.success(res.message || 'Respuesta enviada');
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? [...new Set(Object.values(errs).flat())].join(' · ') : (err.response?.data?.message || 'Error al enviar'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.team_leader.trim()) return setError('Indica el líder del equipo');
    if (!form.area.trim())        return setError('Indica el área');
    if (!form.root_cause.replace(/<[^>]*>/g, '').trim()) return setError('Describe la causa raíz');
    for (let i = 0; i < form.actions.length; i++) {
      const a = form.actions[i];
      if (!a.action.trim() || !a.responsible.trim() || !a.commitment_date || !a.evidence_to_deliver.trim())
        return setError(`Acción ${i + 1}: completa la acción, el responsable, la fecha compromiso y la evidencia a entregar`);
    }
    if (window.confirm('¿Enviar su respuesta a DASAVENA? Calidad la revisará y le notificará el resultado por correo.')) mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 border-2 rounded-xl border-primary-200 bg-primary-50/30">
      <div>
        <p className="flex items-center gap-1 text-sm font-bold text-primary-800"><ClipboardList className="w-4 h-4"/>Segunda sección — su respuesta</p>
        <p className="text-xs text-gray-500">Análisis de la causa raíz y plan de acciones correctivas. Puede utilizar la metodología que prefiera (Ishikawa, 5 porqués, etc.).</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Líder del equipo *</label>
          <input value={form.team_leader} onChange={e => set('team_leader', e.target.value)} maxLength={255} className={inputCls}/>
        </div>
        <div>
          <label className={labelCls}>Área *</label>
          <input value={form.area} onChange={e => set('area', e.target.value)} maxLength={255} className={inputCls}/>
        </div>
      </div>

      <div>
        <label className={labelCls}>Descripción de la causa raíz *</label>
        <RichTextEditor value={form.root_cause} onChange={v => set('root_cause', v)} minHeight="min-h-[260px]"
          placeholder="Contención, causa raíz confirmada, análisis de causas (Ishikawa), 5 porqués..."/>
        <p className="mt-1 text-[11px] text-gray-500">Puede pegar desde Word: se conservan viñetas, numeración y negritas.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-700">Acciones correctivas *</p>
          <p className="text-[11px] text-gray-500">Deberá entregar una evidencia por cada acción</p>
        </div>
        {form.actions.map((a, i) => (
          <div key={i} className="p-3 space-y-2 bg-white border-2 border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-primary-700">Acción {i + 1}</p>
              {form.actions.length > 1 && (
                <button type="button" onClick={() => removeAction(i)} className="p-1 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600" title="Quitar acción"><Trash2 className="w-4 h-4"/></button>
              )}
            </div>
            <div>
              <label className={labelCls}>Acción *</label>
              <textarea value={a.action} onChange={e => setAction(i, 'action', e.target.value)} rows={2} maxLength={2000} className={`${inputCls} resize-none`}/>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Responsable *</label>
                <input value={a.responsible} onChange={e => setAction(i, 'responsible', e.target.value)} maxLength={255} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Fecha compromiso *</label>
                <input type="date" value={a.commitment_date} onChange={e => setAction(i, 'commitment_date', e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Fecha de realización</label>
                <input type="date" value={a.completion_date} onChange={e => setAction(i, 'completion_date', e.target.value)} className={inputCls}/>
              </div>
            </div>
            <div>
              <label className={labelCls}>Evidencia a entregar *</label>
              <input value={a.evidence_to_deliver} onChange={e => setAction(i, 'evidence_to_deliver', e.target.value)} maxLength={2000}
                placeholder="Ej. Lista de asistencia, bitácora, procedimiento actualizado..." className={inputCls}/>
            </div>
          </div>
        ))}
        {form.actions.length < 20 && (
          <button type="button" onClick={addAction}
            className="flex items-center justify-center w-full gap-1 py-2 text-sm font-semibold border-2 border-dashed rounded-xl text-primary-600 border-primary-200 hover:bg-primary-50">
            <Plus className="w-4 h-4"/>Agregar acción correctiva
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/><p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button type="submit" loading={mutation.isPending} leftIcon={<Send className="w-4 h-4"/>} className="w-full">
        {previous ? `Enviar corrección (vuelta ${previous.round + 1})` : 'Enviar respuesta'}
      </Button>
    </form>
  );
};

// ─── Detalle (solo lectura en la fase 1) ──────────────────────────────────────
const ProviderNcDetail = ({ ncId, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['provider-non-conformities', 'detail', ncId],
    queryFn: () => nonConformityService.myGetById(ncId),
  });
  const nc = data?.non_conformity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary"><FileWarning className="w-5 h-5 text-white"/></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">No Conformidad {nc?.folio}</h2>
              {nc && <p className="text-xs text-gray-500">{nc.type?.name} · {nc.product?.name}</p>}
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
            <div className="flex justify-end">
              <PdfButton onClick={() => nonConformityService.myDownloadPdf(nc.id, nc.folio)}/>
            </div>
            <NcTimeline nc={nc}/>

            {nc.is_overdue && (
              <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-red-700">El plazo de esta No Conformidad está vencido. Atenderla influye en su calificación como proveedor.</p>
              </div>
            )}

            <div className="p-3 border border-gray-200 rounded-xl">
              <NcField label="Folio">{nc.folio}</NcField>
              <NcField label="Fecha de desviación">{fmtDate(nc.deviation_date)}</NcField>
              <NcField label="Producto">{nc.product?.name}</NcField>
              <NcField label="Lote">{nc.lot}</NcField>
              <NcField label="Fecha de recepción">{nc.reception_date ? fmtDate(nc.reception_date) : null}</NcField>
              <NcField label="Cantidad involucrada">{fmtQuantity(nc)}</NcField>
              <NcField label="Tipo de desviación">{nc.type?.name}</NcField>
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

            {!nc.response_received_at && (
              <div className="flex items-start gap-2 p-3 border border-blue-200 rounded-xl bg-blue-50">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-blue-700">
                  Tiene <strong>28 días</strong> desde la emisión para enviar su análisis de causa raíz y acciones correctivas.
                  Una vez enviadas, cuenta con otros 28 días para entregar las evidencias.
                </p>
              </div>
            )}

            {/* ── Segunda sección ── */}
            {nc.status === 'plan_returned' && nc.responses?.[0]?.review_comment && (
              <div className="p-3 border-2 border-orange-200 rounded-xl bg-orange-50">
                <p className="flex items-center gap-1 text-xs font-bold text-orange-800"><MessageSquare className="w-3.5 h-3.5"/>DASAVENA solicita correcciones a su respuesta</p>
                <p className="mt-1 text-sm text-orange-900 whitespace-pre-line">{nc.responses[0].review_comment}</p>
                <p className="mt-2 text-[11px] text-orange-700">Los plazos no se reinician. Corrija su respuesta y vuelva a enviarla.</p>
              </div>
            )}

            {nc.status === 'plan_in_review' && (
              <div className="flex items-start gap-2 p-3 border border-blue-200 rounded-xl bg-blue-50">
                <Hourglass className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-blue-700">Su respuesta está en revisión por el equipo de Calidad de DASAVENA. Le notificaremos el resultado por correo.</p>
              </div>
            )}

            {nc.status === 'awaiting_evidence' && (
              <div className="flex items-start gap-2 p-3 border border-teal-200 rounded-xl bg-teal-50">
                <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-teal-800">Su plan de acción fue aceptado. Entregue la evidencia de cada acción a más tardar el <strong>{fmtDate(nc.evidence_due_date)}</strong>.</p>
              </div>
            )}

            {nc.status === 'closed' && (
              <div className="flex items-start gap-2 p-3 border-2 border-teal-200 rounded-xl bg-teal-50">
                <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-bold text-teal-900">No Conformidad cerrada el {fmtDate(nc.closed_at?.slice(0, 10))}</p>
                  {nc.closing_comment && <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{nc.closing_comment}</p>}
                </div>
              </div>
            )}

            {/* ── Tercera sección: evidencias ── */}
            {nc.accepted_response_id && (() => {
              const accepted = nc.responses?.find(r => r.id === nc.accepted_response_id);
              if (!accepted) return null;
              return (
                <div className="space-y-3">
                  <p className="flex items-center gap-1 text-xs font-bold tracking-wide uppercase text-primary-700"><ShieldCheck className="w-3.5 h-3.5"/>Evidencias de las acciones correctivas</p>
                  <NcEvidenceProgress progress={nc.evidence_progress}/>
                  {accepted.actions.map(a => <ActionEvidenceUpload key={a.id} nc={nc} action={a}/>)}
                </div>
              );
            })()}

            {nc.can_respond && <ResponseForm key={`${nc.id}-${nc.responses?.length || 0}`} nc={nc}/>}

            {nc.responses?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold tracking-wide uppercase text-primary-700">Historial de respuestas</p>
                <NcRoundsHistory responses={nc.responses}/>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Página ───────────────────────────────────────────────────────────────────
export const ProviderNonConformitiesPage = () => {
  const [detailId, setDetailId] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['provider-non-conformities'], queryFn: nonConformityService.myAll });
  const items = data?.non_conformities || [];
  const open  = items.filter(nc => !nc.closed_at);

  return (
    <div className="space-y-6">
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><FileWarning className="w-6 h-6 text-white"/></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">No Conformidades</h1>
            <p className="text-sm text-gray-600">Desviaciones detectadas por DASAVENA en sus productos</p>
          </div>
        </div>
      </div>

      {open.some(nc => nc.is_overdue) && (
        <div className="flex items-start gap-3 p-4 border-2 border-red-300 rounded-xl bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-red-700">Tiene No Conformidades con el plazo vencido. Atenderlas influye en su calificación como proveedor.</p>
        </div>
      )}

      <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 rounded-full border-t-primary-500 animate-spin"/></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <FileWarning className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
            <p className="font-medium text-gray-600">No tiene No Conformidades registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map(nc => (
              <button key={nc.id} onClick={() => setDetailId(nc.id)}
                className="flex items-center w-full gap-4 p-4 text-left transition-colors hover:bg-primary-50/40">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-primary-700">{nc.folio}</span>
                    <NcStatusBadge status={nc.display_status}/>
                    {nc.can_respond && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white">Requiere su respuesta</span>}
                    {nc.status === 'awaiting_evidence' && nc.evidence_progress && (nc.evidence_progress.missing + nc.evidence_progress.rejected) > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white">Faltan evidencias</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{nc.type?.name} · {nc.product?.name}</p>
                  <p className="text-xs text-gray-500">Desviación: {fmtDate(nc.deviation_date)}{nc.lot ? ` · Lote ${nc.lot}` : ''}</p>
                </div>
                <div className="flex-shrink-0 text-right"><NcDueInfo nc={nc}/></div>
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-300"/>
              </button>
            ))}
          </div>
        )}
      </div>

      {detailId && <ProviderNcDetail ncId={detailId} onClose={() => setDetailId(null)}/>}
    </div>
  );
};
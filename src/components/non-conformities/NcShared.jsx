import React, { useState, useEffect } from 'react';
import { nonConformityService } from '../../api/nonConformityService';
import { RichTextView } from '../common/RichTextView';
import { Clock, AlertTriangle, CheckCircle, XCircle, FileWarning, Hourglass, ChevronDown, ChevronUp, MessageSquare, User, Download, Paperclip } from 'lucide-react';

// Mismos nombres de estado que el Excel de indicadores de Calidad
export const NC_STATUS_STYLES = {
  'Sin respuesta':               { badge: 'bg-amber-100 text-amber-800 border-amber-200',    card: 'border-amber-200',  value: 'text-amber-600',  Icon: Hourglass },
  'Falta acción correctiva':     { badge: 'bg-orange-100 text-orange-800 border-orange-200', card: 'border-orange-200', value: 'text-orange-600', Icon: FileWarning },
  'Falta evidencia':             { badge: 'bg-blue-100 text-blue-800 border-blue-200',       card: 'border-blue-200',   value: 'text-blue-600',   Icon: Clock },
  'Finalizada':                  { badge: 'bg-teal-100 text-teal-800 border-teal-200',       card: 'border-teal-200',   value: 'text-teal-600',   Icon: CheckCircle },
  'Finalizada, fuera de tiempo': { badge: 'bg-slate-200 text-slate-700 border-slate-300',    card: 'border-slate-300',  value: 'text-slate-600',  Icon: CheckCircle },
  'Sin cerrar, fuera de tiempo': { badge: 'bg-red-100 text-red-800 border-red-200',          card: 'border-red-200',    value: 'text-red-600',    Icon: XCircle },
};

export const fmtDate = (d) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export const fmtQuantity = (nc) => {
  if (nc.quantity_involved === null || nc.quantity_involved === undefined) return '—';
  const n = parseFloat(nc.quantity_involved);
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ${nc.unit?.abbreviation || ''}`.trim();
};

export const NcStatusBadge = ({ status }) => {
  const s = NC_STATUS_STYLES[status] || NC_STATUS_STYLES['Sin respuesta'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${s.badge}`}>
      <s.Icon className="w-3 h-3"/>{status}
    </span>
  );
};

/** Fecha límite vigente con días restantes o días de atraso */
export const NcDueInfo = ({ nc, compact = false }) => {
  if (!nc.current_due_date) {
    return <span className="text-xs text-gray-400">{nc.closed_at ? `Cerrada ${fmtDate(nc.closed_at.slice(0, 10))}` : '—'}</span>;
  }
  const late = nc.days_left < 0;
  const soon = !late && nc.days_left <= 7;
  const label = nc.response_received_at ? 'Evidencias' : 'Respuesta';
  return (
    <div className={compact ? '' : 'leading-tight'}>
      <p className="text-sm text-gray-700 whitespace-nowrap">{fmtDate(nc.current_due_date)}</p>
      <p className={`text-[11px] font-semibold whitespace-nowrap ${late ? 'text-red-600' : soon ? 'text-amber-600' : 'text-gray-400'}`}>
        {late
          ? <><AlertTriangle className="inline w-3 h-3 mr-0.5"/>{label}: vencida hace {Math.abs(nc.days_left)} día{Math.abs(nc.days_left) !== 1 ? 's' : ''}</>
          : `${label}: ${nc.days_left === 0 ? 'vence hoy' : `${nc.days_left} día${nc.days_left !== 1 ? 's' : ''}`}`}
      </p>
    </div>
  );
};

/** Foto guardada (se pide con el token como blob) */
export const NcPhotoThumb = ({ photoId, onDelete, size = 'w-24 h-24' }) => {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl; let alive = true;
    nonConformityService.getPhotoBlob(photoId)
      .then(blob => { if (!alive) return; objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photoId]);

  return (
    <div className={`relative overflow-hidden bg-gray-100 border-2 border-gray-200 rounded-lg ${size}`}>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" title="Ver foto completa">
          <img src={src} alt="Evidencia de la No Conformidad" className="object-cover w-full h-full"/>
        </a>
      ) : failed ? (
        <div className="flex items-center justify-center w-full h-full p-1 text-[10px] text-center text-gray-400">No disponible</div>
      ) : (
        <div className="flex items-center justify-center w-full h-full"><div className="w-5 h-5 border-2 rounded-full border-t-primary-500 animate-spin"/></div>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} title="Eliminar foto"
          className="absolute flex items-center justify-center w-5 h-5 text-xs text-white rounded-full top-1 right-1 bg-black/60 hover:bg-red-600">×</button>
      )}
    </div>
  );
};

/** Fila de dato (etiqueta / valor) al estilo del formato F-CAL-24 */
export const NcField = ({ label, children }) => (
  <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
    <p className="text-xs font-semibold text-primary-700">{label}</p>
    <div className="text-sm text-gray-800">{children || '—'}</div>
  </div>
);

/** Línea de tiempo de plazos */
export const NcTimeline = ({ nc }) => {
  const steps = [
    { label: 'Emitida',                     date: nc.issued_at,            done: true },
    { label: 'Límite de respuesta',         date: nc.response_due_date,    done: !!nc.response_received_at, due: true },
    { label: 'Acción correctiva recibida',  date: nc.response_received_at, done: !!nc.response_received_at },
    { label: 'Límite de evidencias',        date: nc.evidence_due_date,    done: !!nc.closed_at, due: true },
    { label: 'Cerrada',                     date: nc.closed_at?.slice(0, 10), done: !!nc.closed_at },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map(s => (
        <div key={s.label} className={`flex-1 min-w-[120px] p-2 rounded-lg border text-center ${s.done ? 'border-teal-200 bg-teal-50' : s.due ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className="text-[11px] font-semibold text-gray-500">{s.label}</p>
          <p className="text-xs font-bold text-gray-800">{s.date ? fmtDate(s.date) : '—'}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Sección 2: una vuelta de respuesta del proveedor ─────────────────────────
const REVIEW_STYLES = {
  pending:  'bg-blue-100 text-blue-800 border-blue-200',
  accepted: 'bg-teal-100 text-teal-800 border-teal-200',
  returned: 'bg-orange-100 text-orange-800 border-orange-200',
};

const fmtDateTime = (dt) => dt
  ? new Date(dt.replace(' ', 'T')).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export const NcResponseCard = ({ response, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full gap-2 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-800">Vuelta {response.round}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${REVIEW_STYLES[response.review_status] || REVIEW_STYLES.pending}`}>{response.review_label}</span>
          <span className="text-xs text-gray-500">Enviada {fmtDateTime(response.submitted_at)}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p className="text-sm"><span className="text-xs font-semibold text-primary-700">Líder del equipo: </span>{response.team_leader}</p>
            <p className="text-sm"><span className="text-xs font-semibold text-primary-700">Área: </span>{response.area}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-primary-700">Identificación de la causa raíz</p>
            <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 max-h-96"><RichTextView value={response.root_cause}/></div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-primary-700">Acciones correctivas</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-primary-50">
                  <tr>
                    {['#', 'Acción', 'Responsable', 'Compromiso', 'Realización', 'Evidencia a entregar'].map(h => (
                      <th key={h} className="px-2 py-2 font-bold text-left text-primary-700 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {response.actions.map((a, i) => (
                    <tr key={a.id} className="align-top">
                      <td className="px-2 py-2 font-semibold text-gray-500">{i + 1}</td>
                      <td className="px-2 py-2 text-gray-800 min-w-[180px] whitespace-pre-line">{a.action}</td>
                      <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{a.responsible}</td>
                      <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{fmtDate(a.commitment_date)}</td>
                      <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{a.completion_date ? fmtDate(a.completion_date) : '—'}</td>
                      <td className="px-2 py-2 text-gray-800 min-w-[160px] whitespace-pre-line">{a.evidence_to_deliver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {response.review_status !== 'pending' && (
            <div className={`p-3 rounded-lg border ${response.review_status === 'accepted' ? 'border-teal-200 bg-teal-50' : 'border-orange-200 bg-orange-50'}`}>
              <p className="flex items-center gap-1 text-xs font-semibold text-gray-700"><MessageSquare className="w-3.5 h-3.5"/>Revisión de DASAVENA · {fmtDateTime(response.reviewed_at)}</p>
              {response.reviewed_by && <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5"><User className="w-3 h-3"/>{response.reviewed_by}</p>}
              <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">{response.review_comment || (response.review_status === 'accepted' ? 'Plan aceptado.' : '—')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Historial de vueltas: la más reciente abierta */
export const NcRoundsHistory = ({ responses = [] }) => (
  <div className="space-y-2">
    {responses.map((r, i) => <NcResponseCard key={r.id} response={r} defaultOpen={i === 0}/>)}
  </div>
);

// ─── Sección 3: evidencias ────────────────────────────────────────────────────
export const EVIDENCE_STATUS = {
  missing:  { label: 'Pendiente de entregar', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  pending:  { label: 'En revisión',           badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  accepted: { label: 'Cumple',                badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  rejected: { label: 'No cumple',             badge: 'bg-red-100 text-red-800 border-red-200' },
};

export const EvidenceBadge = ({ status }) => {
  const s = EVIDENCE_STATUS[status] || EVIDENCE_STATUS.missing;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${s.badge}`}>{s.label}</span>;
};

/** Barra de avance: evidencias en "Cumple" sobre el total de acciones */
export const NcEvidenceProgress = ({ progress }) => {
  if (!progress || !progress.total) return null;
  const pct = Math.round((progress.accepted / progress.total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="font-semibold text-gray-600">Evidencias aceptadas</span>
        <span className="font-bold text-teal-700">{progress.accepted} de {progress.total}</span>
      </div>
      <div className="h-2 overflow-hidden bg-gray-200 rounded-full"><div className="h-full bg-teal-500" style={{ width: `${pct}%` }}/></div>
      <p className="mt-1 text-[11px] text-gray-500">
        {progress.pending > 0 && `${progress.pending} en revisión · `}
        {progress.rejected > 0 && `${progress.rejected} no cumple · `}
        {progress.missing > 0 && `${progress.missing} pendiente${progress.missing > 1 ? 's' : ''} de entregar`}
      </p>
    </div>
  );
};

/** Un intento de evidencia: archivo, comentario del proveedor y revisión */
export const EvidenceAttempt = ({ evidence, onDownload }) => (
  <div className="p-2.5 space-y-1.5 border border-gray-200 rounded-lg bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => onDownload(evidence)}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline min-w-0">
        <Paperclip className="flex-shrink-0 w-3.5 h-3.5"/><span className="truncate">{evidence.original_name}</span><Download className="flex-shrink-0 w-3.5 h-3.5"/>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">Intento {evidence.attempt} · {fmtDateTime(evidence.submitted_at)}</span>
        <EvidenceBadge status={evidence.review_status}/>
      </div>
    </div>
    {evidence.provider_comment && <p className="text-xs text-gray-600"><span className="font-semibold">Comentario del proveedor:</span> {evidence.provider_comment}</p>}
    {evidence.review_status !== 'pending' && (evidence.review_comment || evidence.reviewed_by) && (
      <p className={`text-xs ${evidence.review_status === 'accepted' ? 'text-teal-800' : 'text-red-700'}`}>
        <span className="font-semibold">Revisión de DASAVENA{evidence.reviewed_by ? ` (${evidence.reviewed_by})` : ''}:</span> {evidence.review_comment || evidence.review_label}
      </p>
    )}
  </div>
);
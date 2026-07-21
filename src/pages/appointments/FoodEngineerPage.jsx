import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import api from '../../api/axios';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  FlaskConical, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  X, AlertCircle, History, Info, Search, Filter, Package, Calendar,
  ChevronLeft, ChevronRight, Wrench, UserX, Shield, FileText, RefreshCw, Ban,
} from 'lucide-react';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ✅ Horas para la vista semana tipo calendario (7:00 a 19:00, cada 30 min)
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30;
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
});

const calcEndTime = (startTime, durationMins) => {
  if (!startTime || !durationMins) return null;
  const clean = startTime.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  const total  = h * 60 + m + Number(durationMins);
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
};

const REJECTION_REASONS = [
  { value: 'inocuidad', label: 'Inocuidad' },
  { value: 'calidad',   label: 'Calidad'   },
];

// ─── Helpers de color ─────────────────────────────────────────────────────────
const getAppointmentColor = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-400';
  if (a.status === 'cancelled')                                      return 'bg-red-300';
  if (a.reception_status === 'not_delivered')                        return 'bg-slate-400'; // ✅ nuevo
  if (a.reception_status === 'rejected')                             return 'bg-red-500';
  if (a.reception_status === 'partial')                              return 'bg-amber-500';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-500';
  if (a.status === 'confirmed')                                      return 'bg-green-500';
  return 'bg-blue-500';
};

const getHourBlockColor = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-100 text-orange-700';
  if (a.reception_status === 'not_delivered')                        return 'bg-slate-100 text-slate-700'; // ✅ nuevo
  if (a.reception_status === 'rejected')                             return 'bg-red-100 text-red-700';
  if (a.reception_status === 'partial')                              return 'bg-amber-100 text-amber-700';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-800';
};

const getCardBorder = (a) => {
  if (a.status === 'no_show')                                        return 'border-orange-200 bg-orange-50/20';
  if (a.reception_status === 'not_delivered')                        return 'border-slate-300 bg-slate-50/40'; // ✅ nuevo
  if (a.reception_status === 'rejected')                             return 'border-red-200 bg-red-50/20';
  if (a.reception_status === 'partial')                              return 'border-amber-200 bg-amber-50/20';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'border-teal-200 bg-teal-50/20';
  return 'border-gray-200 bg-white shadow-sm hover:shadow-md';
};

// ─── Tarjeta de espacio bloqueado (solo lectura) ──────────────────────────────
const BlockCard = ({ block }) => (
  <div className="flex items-center gap-4 p-4 border-2 border-red-200 rounded-xl bg-red-50/40">
    <div className="flex flex-col items-center justify-center flex-shrink-0 w-16 h-16 text-xs font-bold leading-tight text-center text-red-700 bg-red-100 rounded-xl">
      <span>{block.start_time}</span>
      <span className="text-red-300">—</span>
      <span>{block.end_time}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Ban className="flex-shrink-0 w-4 h-4 text-red-500"/>
        <p className="font-bold text-red-800 truncate">{block.title}</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          Espacio bloqueado
        </span>
      </div>
      {block.notes && <p className="text-xs italic text-red-600">"{block.notes}"</p>}
    </div>
  </div>
);

// ─── Fila de item en el modal de recepción ────────────────────────────────────
const ItemReceptionRow = ({ item, units, onChange }) => {
  const qtyRec = parseFloat(item.quantity_received) || 0;
  const qtyRej = parseFloat(item.quantity_rejected) || 0;
  const qtyAcc = Math.max(0, qtyRec - qtyRej);
  const isPartial  = qtyRej > 0 && qtyRej < qtyRec;
  const isRejected = qtyRej >= qtyRec && qtyRec > 0;
  const selectedUnit = units.find(u => u.id === parseInt(item.received_unit_id));
  const unitAbbr = selectedUnit?.abbreviation || '';
  const notDelivered = !!item.not_delivered;

  return (
    <div className={`p-4 rounded-xl border-2 space-y-3 ${
      notDelivered ? 'border-gray-300 bg-gray-50' :
      isRejected ? 'border-red-200 bg-red-50/30' :
      isPartial  ? 'border-amber-200 bg-amber-50/30' :
      qtyRec > 0 ? 'border-teal-200 bg-teal-50/20' :
      'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center gap-2">
        {item.product_type === 'product'
          ? <Package className={`w-4 h-4 flex-shrink-0 ${notDelivered ? 'text-gray-400' : 'text-primary-500'}`}/>
          : <Wrench   className={`w-4 h-4 flex-shrink-0 ${notDelivered ? 'text-gray-400' : 'text-teal-500'}`}/>}
        <p className={`text-sm font-bold ${notDelivered ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.product_name}</p>
        {item.quantity_expected && !notDelivered && (
          <span className="ml-auto text-xs font-medium text-gray-400 whitespace-nowrap">
            Esperado: {item.quantity_expected} {item.unit?.abbreviation}
          </span>
        )}
        {notDelivered && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
            <XCircle className="w-3 h-3"/>No entregado
          </span>
        )}
      </div>

      {/* ✅ Checkbox "No entregado en esta cita" */}
      <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
        <input type="checkbox" checked={notDelivered} onChange={e => onChange('not_delivered', e.target.checked)}
          className="w-4 h-4 text-gray-500 border-gray-300 rounded"/>
        <span className="text-xs font-semibold text-gray-500">No entregado en esta cita (el proveedor no lo trajo)</span>
      </label>

      {!notDelivered && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-500">Cantidad recibida *</label>
              <input type="number" value={item.quantity_received} min="0" step="0.01" placeholder="0"
                onChange={e => onChange('quantity_received', e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-500">Unidad *</label>
              <select value={item.received_unit_id} onChange={e => onChange('received_unit_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400">
                <option value="">Unidad</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation} — {u.name}</option>)}
              </select>
            </div>
          </div>

          {qtyRec > 0 && (
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-500">
                Cantidad devuelta al proveedor <span className="font-normal text-gray-400">(0 si se recibió todo)</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="number" value={item.quantity_rejected} min="0" max={item.quantity_received} step="0.01" placeholder="0"
                  onChange={e => onChange('quantity_rejected', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
                {unitAbbr && <span className="text-xs font-medium text-gray-500">{unitAbbr}</span>}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-xs text-blue-500">Llegó</p>
                  <p className="text-xs font-bold text-blue-800">{qtyRec} {unitAbbr}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-green-50 border border-green-200 text-center">
                  <p className="text-xs text-green-500">Acepta</p>
                  <p className="text-xs font-bold text-green-800">{qtyAcc.toFixed(2)} {unitAbbr}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-center">
                  <p className="text-xs text-red-500">Devuelve</p>
                  <p className="text-xs font-bold text-red-800">{qtyRej.toFixed(2)} {unitAbbr}</p>
                </div>
              </div>
            </div>
          )}

          {qtyRej > 0 && (
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-500">Motivo del rechazo *</label>
              <div className="grid grid-cols-2 gap-2">
                {REJECTION_REASONS.map(r => (
                  <button key={r.value} type="button" onClick={() => onChange('rejection_reason', r.value)}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      item.rejection_reason === r.value
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block mb-1 text-xs font-semibold text-gray-500">
          Observaciones {qtyRej > 0 && !notDelivered ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-400">(opcional)</span>}
        </label>
        <textarea value={item.reception_notes} onChange={e => onChange('reception_notes', e.target.value)}
          rows={2} maxLength={500}
          placeholder={notDelivered ? 'Motivo por el que no se entregó...' : qtyRej > 0 ? 'Describe el problema...' : 'Condiciones, temperatura, observaciones...'}
          className="w-full px-3 py-2 text-sm border-2 border-gray-200 resize-none rounded-xl focus:outline-none focus:border-teal-400"/>
      </div>
    </div>
  );
};

// ─── Modal selector de citas del día ─────────────────────────────────────────
const DayAppointmentsModal = ({ dateStr, appointments, blocks = [], onSelect, onClose }) => {
  const dateDisplay = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  const getStatusBadge = (a) => {
    if (a.status === 'no_show')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>;
    if (!a.is_entry_confirmed)
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Shield className="w-3 h-3"/>Espera Seguridad</span>;
    if (a.is_reception_reviewed) {
      if (a.reception_status === 'not_delivered') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300"><XCircle className="w-3 h-3"/>No entregado</span>;
      if (a.reception_status === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rechazado</span>;
      if (a.reception_status === 'partial')  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3"/>Parcial</span>;
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><CheckCircle className="w-3 h-3"/>Aceptado</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Listo para recibir</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* ✅ Scroll agregado */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-green-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-to-br from-teal-500 to-green-500">
              <Calendar className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Entregas del día</h2>
              <p className="text-xs text-gray-500 capitalize">{dateDisplay}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-4 space-y-2">
          {/* ✅ Bloqueos del día — solo informativos, no seleccionables */}
          {blocks.length > 0 && (
            <div className="space-y-1.5 mb-1">
              {blocks.map(b => (
                <div key={`b-${b.id}`} className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-red-200 bg-red-50/60">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-10 rounded-lg bg-red-100 text-red-700 text-[11px] font-bold text-center leading-tight">
                    {b.start_time}–{b.end_time}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-red-500 flex-shrink-0"/>
                    <p className="text-sm font-semibold text-red-800 truncate">{b.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mb-3 text-xs text-gray-500">Selecciona la entrega que deseas revisar:</p>
          {appointments.map(a => (
            <button key={a.id} type="button" onClick={() => onSelect(a)}
              className="flex items-center w-full gap-3 p-3 text-left transition-all border-2 border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 group">
              <div className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl font-bold text-base ${getHourBlockColor(a)}`}>
                {a.appointment_time?.slice(0,5)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{a.provider?.business_name}</p>
                {a.items?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.items.slice(0,2).map(item => (
                      <span key={item.id} className="text-xs text-gray-500 flex items-center gap-0.5">
                        {item.product_type === 'product' ? <Package className="w-2.5 h-2.5"/> : <Wrench className="w-2.5 h-2.5"/>}
                        {item.product_name}
                      </span>
                    ))}
                    {a.items.length > 2 && <span className="text-xs text-gray-400">+{a.items.length-2}</span>}
                  </div>
                )}
                <div className="mt-1">{getStatusBadge(a)}</div>
              </div>
              <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-300 group-hover:text-teal-500"/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Modal de recepción ───────────────────────────────────────────────────────
// onBack — si viene definido, muestra botón "Atrás" en lugar de solo la X
const ReceptionModal = ({ appointment, onClose, onBack }) => {
  const queryClient = useQueryClient();
  const [globalNotes, setGlobalNotes] = useState('');
  const [error, setError] = useState('');
 
  const isNoShow                  = appointment.status === 'no_show';
  const needsSecurityConfirmation = !appointment.is_entry_confirmed && !isNoShow;
  const isAlreadyReviewed         = appointment.is_reception_reviewed;
 
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: appointmentService.getUnits,
    staleTime: 10 * 60 * 1000,
  });
  const units = unitsData?.units || [];
 
  const [itemsState, setItemsState] = useState(() =>
    (appointment.items || []).map(item => ({
      id:                item.id,
      product_name:      item.product_name,
      product_type:      item.product_type,
      quantity_expected: item.quantity_expected,
      unit:              item.unit,
      quantity_received: '',
      received_unit_id:  item.unit?.id ? String(item.unit.id) : '',
      quantity_rejected: '',
      rejection_reason:  '',
      reception_notes:   '',
      not_delivered:      false,
    }))
  );
 
  // ✅ updateItem: si se marca not_delivered, limpia los campos de cantidad de ese ítem
  const updateItem = (idx, field, value) =>
    setItemsState(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'not_delivered' && value === true) {
        return { ...item, not_delivered: true, quantity_received: '', quantity_rejected: '', rejection_reason: '' };
      }
      return { ...item, [field]: value };
    }));
 
  const mutation = useMutation({
    mutationFn: () => appointmentService.registerReception(appointment.id, {
      reception_notes: globalNotes || undefined,
      items: itemsState.map(item => ({
        id:                item.id,
        not_delivered:     item.not_delivered || undefined,
        quantity_received: item.not_delivered ? 0 : item.quantity_received,
        received_unit_id:  item.not_delivered ? undefined : item.received_unit_id,
        quantity_rejected: !item.not_delivered && parseFloat(item.quantity_rejected) > 0 ? item.quantity_rejected : undefined,
        rejection_reason:  !item.not_delivered ? (item.rejection_reason || undefined) : undefined,
        reception_notes:   item.reception_notes || undefined,
      })),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['food-engineer-month']);
      queryClient.invalidateQueries(['food-engineer-day']);
      queryClient.invalidateQueries(['food-engineer-week']);
      queryClient.invalidateQueries(['food-engineer-history']);
      showToast.success(res.message || 'Recepción registrada');
      onClose();
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });
 
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    for (let i = 0; i < itemsState.length; i++) {
      const item = itemsState[i];
      if (item.not_delivered) continue; // ✅ se omite la validación de cantidades
      const qtyRec = parseFloat(item.quantity_received) || 0;
      const qtyRej = parseFloat(item.quantity_rejected) || 0;
      if (qtyRec <= 0)                              { setError(`"${item.product_name}": ingresa la cantidad recibida`); return; }
      if (!item.received_unit_id)                   { setError(`"${item.product_name}": selecciona la unidad`); return; }
      if (qtyRej > qtyRec)                          { setError(`"${item.product_name}": la cantidad devuelta no puede superar la recibida`); return; }
      if (qtyRej > 0 && !item.rejection_reason)     { setError(`"${item.product_name}": selecciona el motivo del rechazo`); return; }
      if (qtyRej > 0 && !item.reception_notes?.trim()) { setError(`"${item.product_name}": las observaciones son obligatorias al rechazar`); return; }
    }
    mutation.mutate();
  };
 
  const hasAnyRejection = itemsState.some(i => !i.not_delivered && parseFloat(i.quantity_rejected) > 0);
  const allRejected     = itemsState.filter(i => !i.not_delivered).length > 0 &&
    itemsState.filter(i => !i.not_delivered).every(i => { const r = parseFloat(i.quantity_received)||0; const j = parseFloat(i.quantity_rejected)||0; return r > 0 && j >= r; });
 
  // Header dinámico según estado
  const headerConfig = isNoShow
    ? { bg: 'from-orange-50 to-red-50',    icon: 'bg-orange-500', Icon: UserX,       title: 'Proveedor no se presentó'       }
    : needsSecurityConfirmation
      ? { bg: 'from-amber-50 to-yellow-50', icon: 'bg-amber-500',  Icon: Shield,      title: 'Entrada pendiente de confirmar' }
      : isAlreadyReviewed
        ? { bg: 'from-teal-50 to-green-50', icon: 'bg-gradient-to-br from-teal-500 to-green-500', Icon: CheckCircle, title: 'Recepción registrada' }
        : { bg: 'from-teal-50 to-green-50', icon: 'bg-gradient-to-br from-teal-500 to-green-500', Icon: FlaskConical, title: 'Registrar recepción' };
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${headerConfig.bg} rounded-t-2xl sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack}
                className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors rounded-lg hover:bg-white/60 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5"/>
              </button>
            )}
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md ${headerConfig.icon}`}>
              <headerConfig.Icon className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{headerConfig.title}</h2>
              <p className="text-xs text-gray-500">
                {appointment.provider?.business_name} · {appointment.appointment_time?.slice(0,5)} hrs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5"/>
          </button>
        </div>
 
        <div className="p-6">
 
          {/* ── Estado 1: No se presentó ── */}
          {isNoShow && (
            <div className="space-y-4">
              <div className="p-5 space-y-3 border-2 border-orange-300 rounded-xl bg-orange-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl">
                    <UserX className="w-6 h-6 text-orange-600"/>
                  </div>
                  <div>
                    <p className="text-base font-bold text-orange-800">El proveedor no se presentó</p>
                    <p className="text-sm text-orange-600 mt-0.5">Seguridad registró que este proveedor no llegó.</p>
                  </div>
                </div>
                {appointment.no_show_notes && (
                  <div className="pl-4 border-l-2 border-orange-300">
                    <p className="text-xs text-orange-500 font-semibold mb-0.5">Observaciones de Seguridad:</p>
                    <p className="text-sm italic text-orange-700">"{appointment.no_show_notes}"</p>
                  </div>
                )}
                <p className="pt-2 text-xs text-orange-600 border-t border-orange-200">
                  No es posible registrar una recepción. Si el proveedor llegó después, contacta a Compras para reagendar.
                </p>
              </div>
              <div className="flex justify-between">
                {onBack ? <Button variant="secondary" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4"/>}>Volver</Button> : <div/>}
                <Button variant="ghost" onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
 
          {/* ── Estado 2: Espera Seguridad ── */}
          {needsSecurityConfirmation && (
            <div className="space-y-4">
              <div className="p-5 space-y-3 border-2 rounded-xl border-amber-300 bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl">
                    <Shield className="w-6 h-6 text-amber-600"/>
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-800">Esperando confirmación de Seguridad</p>
                    <p className="text-sm text-amber-600 mt-0.5">El proveedor aún no ha sido registrado como ingresado.</p>
                  </div>
                </div>
                {appointment.items?.length > 0 && (
                  <div className="pt-2 border-t border-amber-200">
                    <p className="mb-2 text-xs font-semibold text-amber-600">Productos agendados:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {appointment.items.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-lg bg-amber-100 text-amber-800 border-amber-200">
                          {item.product_type === 'product' ? <Package className="w-3 h-3"/> : <Wrench className="w-3 h-3"/>}
                          {item.product_name}
                          {item.quantity_expected && <span className="text-amber-500">· {item.quantity_expected} {item.unit?.abbreviation}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="pt-2 text-xs border-t text-amber-600 border-amber-200">
                  Seguridad debe confirmar la entrada desde <strong>Control de Acceso</strong> antes de registrar la recepción.
                </p>
              </div>
              <div className="flex justify-between">
                {onBack ? <Button variant="secondary" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4"/>}>Volver</Button> : <div/>}
                <Button variant="ghost" onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
 
          {/* ── Estado 3: Ya revisada — mostrar resumen ── */}
          {isAlreadyReviewed && !isNoShow && (
            <div className="space-y-4">
              {/* Badge resultado global */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
                appointment.reception_status === 'not_delivered' ? 'border-slate-300 bg-slate-50' :
                appointment.reception_status === 'rejected' ? 'border-red-200 bg-red-50' :
                appointment.reception_status === 'partial'  ? 'border-amber-200 bg-amber-50' :
                'border-teal-200 bg-teal-50'
              }`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${
                  appointment.reception_status === 'not_delivered' ? 'bg-slate-200' :
                  appointment.reception_status === 'rejected' ? 'bg-red-100' :
                  appointment.reception_status === 'partial'  ? 'bg-amber-100' :
                  'bg-teal-100'
                }`}>
                  {appointment.reception_status === 'not_delivered'
                    ? <XCircle className="w-5 h-5 text-slate-600"/>
                    : appointment.reception_status === 'rejected'
                      ? <XCircle className="w-5 h-5 text-red-600"/>
                      : appointment.reception_status === 'partial'
                        ? <AlertCircle className="w-5 h-5 text-amber-600"/>
                        : <CheckCircle className="w-5 h-5 text-teal-600"/>}
                </div>
                <div>
                  <p className={`text-sm font-bold ${
                    appointment.reception_status === 'not_delivered' ? 'text-slate-700' :
                    appointment.reception_status === 'rejected' ? 'text-red-800' :
                    appointment.reception_status === 'partial'  ? 'text-amber-800' :
                    'text-teal-800'
                  }`}>
                    {appointment.reception_status === 'not_delivered' ? 'El proveedor no trajo ningún producto' :
                     appointment.reception_status === 'rejected' ? 'Recepción rechazada' :
                     appointment.reception_status === 'partial'  ? 'Recepción parcial — con devoluciones' :
                     'Recepción aceptada completa'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Registrado por {appointment.reception_reviewed_by} · {appointment.reception_reviewed_at}
                  </p>
                </div>
              </div>
 
              {/* Detalle por producto */}
              {appointment.items?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Detalle por producto</p>
                  {appointment.items.map(item => {
                    const rec  = parseFloat(item.quantity_received) || 0;
                    const rej  = parseFloat(item.quantity_rejected)  || 0;
                    const acc  = Math.max(0, rec - rej);
                    const abbr = item.received_unit?.abbreviation || item.unit?.abbreviation || '';
                    const s    = item.reception_status;
                    if (s === 'not_delivered') {
                      return (
                        <div key={item.id} className="p-3 border rounded-xl border-slate-300 bg-slate-50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-500 line-through flex items-center gap-1.5">
                              {item.product_type === 'product'
                                ? <Package className="w-3.5 h-3.5 text-slate-400"/>
                                : <Wrench   className="w-3.5 h-3.5 text-slate-400"/>}
                              {item.product_name}
                            </p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              No entregado
                            </span>
                          </div>
                          {item.reception_notes && <p className="mt-1 text-xs italic text-slate-600">"{item.reception_notes}"</p>}
                        </div>
                      );
                    }
                    return (
                      <div key={item.id} className={`p-3 rounded-xl border ${
                        s === 'rejected' ? 'border-red-200 bg-red-50' :
                        s === 'partial'  ? 'border-amber-200 bg-amber-50' :
                        'border-teal-200 bg-teal-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                            {item.product_type === 'product'
                              ? <Package className="w-3.5 h-3.5 text-primary-500"/>
                              : <Wrench   className="w-3.5 h-3.5 text-teal-500"/>}
                            {item.product_name}
                          </p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            s === 'rejected' ? 'bg-red-100 text-red-700' :
                            s === 'partial'  ? 'bg-amber-100 text-amber-700' :
                            'bg-teal-100 text-teal-700'
                          }`}>
                            {s === 'rejected' ? 'Rechazado' : s === 'partial' ? 'Parcial' : 'Aceptado'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center"><p className="text-xs text-blue-500">Llegó</p><p className="text-xs font-bold text-blue-800">{rec} {abbr}</p></div>
                          <div className="text-center"><p className="text-xs text-green-500">Aceptado</p><p className="text-xs font-bold text-green-800">{acc.toFixed(2)} {abbr}</p></div>
                          <div className="text-center"><p className="text-xs text-red-500">Devuelto</p><p className="text-xs font-bold text-red-800">{rej.toFixed(2)} {abbr}</p></div>
                        </div>
                        {item.rejection_reason_label && <p className="mt-1 text-xs text-gray-500">Motivo: {item.rejection_reason_label}</p>}
                        {item.reception_notes && <p className="mt-1 text-xs italic text-gray-600">"{item.reception_notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
 
              {appointment.reception_notes && (
                <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                  <p className="mb-1 text-xs font-semibold text-gray-500">Observaciones generales</p>
                  <p className="text-sm text-gray-700">{appointment.reception_notes}</p>
                </div>
              )}
 
              <div className="flex justify-between pt-2">
                {onBack ? <Button variant="secondary" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4"/>}>Volver a la lista</Button> : <div/>}
                <Button variant="ghost" onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
 
          {/* ── Estado 4: Formulario normal ── */}
          {!isNoShow && !needsSecurityConfirmation && !isAlreadyReviewed && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {itemsState.length === 0 ? (
                <div className="p-6 text-center text-gray-400 border-2 border-gray-200 border-dashed rounded-xl">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                  <p>Esta cita no tiene productos registrados</p>
                </div>
              ) : (
                itemsState.map((item, idx) => (
                  <ItemReceptionRow key={item.id} item={item} units={units}
                    onChange={(field, value) => updateItem(idx, field, value)}/>
                ))
              )}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  Observaciones generales <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea value={globalNotes} onChange={e => setGlobalNotes(e.target.value)}
                  rows={2} maxLength={2000} placeholder="Condiciones generales de la entrega..."
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 resize-none"/>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {onBack && (
                  <Button type="button" variant="secondary" onClick={onBack} leftIcon={<ChevronLeft className="w-4 h-4"/>}>
                    Atrás
                  </Button>
                )}
                <Button type="submit" loading={mutation.isPending}
                  className={`flex-1 text-white font-semibold py-2.5 rounded-xl ${
                    allRejected     ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                    hasAnyRejection ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' :
                    'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600'
                  }`}>
                  {allRejected ? 'Registrar rechazo total' : hasAnyRejection ? 'Registrar con devoluciones' : 'Registrar recepción'}
                </Button>
                <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cerrar</Button>
              </div>
            </form>
          )}
 
        </div>
      </div>
    </div>
  );
};

// ─── Tarjeta de entrega ───────────────────────────────────────────────────────
const DeliveryCard = ({ appointment, onRegister, isPast = false }) => {
  const [expanded, setExpanded] = useState(false);
  const isReviewed = appointment.is_reception_reviewed;
  const isNoShow   = appointment.status === 'no_show';
  const status     = appointment.reception_status;
  const hasItems   = appointment.items?.length > 0;
  const canRegister = !isReviewed && !isPast;

  return (
    <div className={`rounded-xl border-2 transition-all ${getCardBorder(appointment)}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1 min-w-0 gap-4">
          <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl font-bold text-lg ${getHourBlockColor(appointment)}`}>
            {appointment.appointment_time?.slice(0,5)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-bold text-gray-900 truncate">{appointment.provider?.business_name}</p>
              {isNoShow && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>}
              {!isNoShow && !appointment.is_entry_confirmed && !isReviewed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Shield className="w-3 h-3"/>Espera Seguridad</span>}
              {!isNoShow && status === 'accepted' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><CheckCircle className="w-3 h-3"/>Aceptado</span>}
              {!isNoShow && status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rechazado</span>}
              {!isNoShow && status === 'partial'  && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3"/>Parcial</span>}
              {!isNoShow && status === 'not_delivered' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300"><XCircle className="w-3 h-3"/>No entregado</span>}
              {!isNoShow && appointment.is_entry_confirmed && !isReviewed && !isPast && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Listo para recibir</span>}
            </div>
            {hasItems && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {appointment.items.slice(0,3).map(item => (
                  <span key={item.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs ${item.reception_status === 'not_delivered' ? 'bg-slate-200 text-slate-500 line-through' : 'bg-gray-100 text-gray-600'}`}>
                    {item.product_type === 'product' ? <Package className="w-2.5 h-2.5"/> : <Wrench className="w-2.5 h-2.5"/>}
                    {item.product_name}
                    {item.quantity_expected && !item.not_delivered && <span className="text-gray-400">· {item.quantity_expected} {item.unit?.abbreviation}</span>}
                  </span>
                ))}
                {appointment.items.length > 3 && <span className="text-xs text-gray-400">+{appointment.items.length-3} más</span>}
              </div>
            )}
            {isReviewed && <p className="mt-1 text-xs text-gray-400">Por {appointment.reception_reviewed_by} · {appointment.reception_reviewed_at}</p>}
          </div>
        </div>
        <div className="flex items-center flex-shrink-0 gap-2 ml-4">
          {canRegister && (
            <Button size="sm" onClick={() => onRegister(appointment)}
              leftIcon={isNoShow ? <UserX className="w-3.5 h-3.5"/> : <FlaskConical className="w-3.5 h-3.5"/>}
              className={`text-white font-semibold whitespace-nowrap ${
                isNoShow ? 'bg-orange-400 hover:bg-orange-500' :
                !appointment.is_entry_confirmed ? 'bg-amber-400 hover:bg-amber-500' :
                'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600'
              }`}>
              {isNoShow ? 'Ver detalle' : !appointment.is_entry_confirmed ? 'Ver estado' : 'Revisar'}
            </Button>
          )}
          {isReviewed && (
            <button onClick={() => setExpanded(!expanded)} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
              {expanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
            </button>
          )}
        </div>
      </div>

      {expanded && isReviewed && hasItems && (
        <div className="px-4 pt-3 pb-4 space-y-2 border-t border-gray-100">
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Detalle por producto</p>
          {appointment.items.map(item => {
            const rec  = parseFloat(item.quantity_received) || 0;
            const rej  = parseFloat(item.quantity_rejected) || 0;
            const acc  = Math.max(0, rec - rej);
            const abbr = item.received_unit?.abbreviation || item.unit?.abbreviation || '';
            const s    = item.reception_status;
            if (s === 'not_delivered') {
              return (
                <div key={item.id} className="p-3 border rounded-xl border-slate-300 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-500 line-through flex items-center gap-1.5">
                      {item.product_type==='product'?<Package className="w-3.5 h-3.5 text-slate-400"/>:<Wrench className="w-3.5 h-3.5 text-slate-400"/>}
                      {item.product_name}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">No entregado</span>
                  </div>
                  {item.reception_notes && <p className="mt-1 text-xs italic text-slate-600">"{item.reception_notes}"</p>}
                </div>
              );
            }
            return (
              <div key={item.id} className={`p-3 rounded-xl border ${s==='rejected'?'border-red-200 bg-red-50':s==='partial'?'border-amber-200 bg-amber-50':'border-teal-200 bg-teal-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    {item.product_type==='product'?<Package className="w-3.5 h-3.5 text-primary-500"/>:<Wrench className="w-3.5 h-3.5 text-teal-500"/>}
                    {item.product_name}
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s==='rejected'?'bg-red-100 text-red-700':s==='partial'?'bg-amber-100 text-amber-700':'bg-teal-100 text-teal-700'}`}>
                    {s==='rejected'?'Rechazado':s==='partial'?'Parcial':'Aceptado'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center"><p className="text-xs text-blue-500">Llegó</p><p className="text-xs font-bold text-blue-800">{rec} {abbr}</p></div>
                  <div className="text-center"><p className="text-xs text-green-500">Acepta</p><p className="text-xs font-bold text-green-800">{acc.toFixed(2)} {abbr}</p></div>
                  <div className="text-center"><p className="text-xs text-red-500">Devuelve</p><p className="text-xs font-bold text-red-800">{rej.toFixed(2)} {abbr}</p></div>
                </div>
                {item.rejection_reason_label && <p className="mt-1 text-xs text-gray-500">Motivo: {item.rejection_reason_label}</p>}
                {item.reception_notes && <p className="mt-1 text-xs italic text-gray-600">"{item.reception_notes}"</p>}
              </div>
            );
          })}
          {appointment.reception_notes && (
            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
              <p className="mb-1 text-xs font-semibold text-gray-500">Observaciones generales</p>
              <p className="text-sm text-gray-700">{appointment.reception_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const FoodEngineerPage = () => {
  const [view,             setView]             = useState('month');
  const [currentDate,      setCurrentDate]      = useState(new Date());
  const [selectedDate,     setSelectedDate]     = useState(new Date().toLocaleDateString('en-CA'));
  const [registeringAppt,  setRegisteringAppt]  = useState(null);
  const [dayModalDate,     setDayModalDate]      = useState(null);
  // ✅ Recordar si el modal de recepción fue abierto desde el selector
  const [fromDayModalDate, setFromDayModalDate] = useState(null);
  const [showHistory,      setShowHistory]      = useState(false);

  const [filterProvider, setFilterProvider] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: monthData, refetch: refetchMonth } = useQuery({
    queryKey: ['food-engineer-month', year, month+1],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ year, month: month+1 }),
    enabled: view === 'month',
    staleTime: 60 * 1000,
  });

  const { data: dayData, isLoading: dayLoading, refetch: refetchDay } = useQuery({
    queryKey: ['food-engineer-day', selectedDate],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ date: selectedDate }),
    enabled: view === 'day',
    refetchInterval: 60 * 1000,
  });

  const getWeekStart = (dateStr) => { const d = new Date(dateStr); d.setDate(d.getDate()-d.getDay()); return d.toLocaleDateString('en-CA'); };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d.toLocaleDateString('en-CA'); });

  const { data: weekData, isLoading: weekLoading, refetch: refetchWeek } = useQuery({
    queryKey: ['food-engineer-week', weekStart],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ view: 'week', week_start: weekStart }),
    enabled: view === 'week',
    refetchInterval: 60 * 1000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['food-engineer-history', appliedFilters],
    queryFn: () => appointmentService.foodEngineerGetAppointments(appliedFilters),
    enabled: showHistory,
  });

  // ✅ Bloques de calendario (solo lectura para este rol — se cargan por mes visible)
  const { data: blocksData } = useQuery({
    queryKey: ['calendar-blocks', year, month+1],
    queryFn: () => api.get('/calendar-blocks', { params: { year, month: month+1 } }).then(r => r.data),
    staleTime: 60 * 1000,
  });
  const blocks = blocksData?.blocks || [];

  const blocksByDate = useMemo(() => {
    const map = {};
    blocks.forEach(b => { if (!map[b.block_date]) map[b.block_date]=[]; map[b.block_date].push(b); });
    return map;
  }, [blocks]);

  const today     = dayData?.today     || [];
  const history   = historyData?.history   || [];
  const providers = historyData?.providers || [];
  const stats     = dayData?.stats     || {};

  const weekAppointments = weekData?.today || [];
  const byDateWeek = useMemo(() => {
    const map = {};
    weekAppointments.forEach(a => { if (!map[a.appointment_date]) map[a.appointment_date]=[]; map[a.appointment_date].push(a); });
    return map;
  }, [weekAppointments]);

  const monthAppointments = monthData?.month_deliveries || [];
  const byDateMonth = useMemo(() => {
    const map = {};
    monthAppointments.forEach(a => { if (!map[a.appointment_date]) map[a.appointment_date]=[]; map[a.appointment_date].push(a); });
    return map;
  }, [monthAppointments]);

  const todayStr    = new Date().toLocaleDateString('en-CA');
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const calCells    = Array.from({length: firstDay+daysInMonth}, (_,i) => i < firstDay ? null : i-firstDay+1);

  const navigateCal = (dir) => {
    if (view === 'month')    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+dir, 1));
    else if (view === 'day') { const d = new Date(selectedDate); d.setDate(d.getDate()+dir); setSelectedDate(d.toLocaleDateString('en-CA')); }
    else                     { const d = new Date(weekStart); d.setDate(d.getDate()+dir*7); setWeekStart(d.toLocaleDateString('en-CA')); }
  };

  // ✅ Click en día: 0 → vista día | 1 → modal directo | 2+ → selector
  const handleDayClick = (dateStr) => {
    const dayAppts = byDateMonth[dateStr] || [];
    if (dayAppts.length === 0) { setSelectedDate(dateStr); setView('day'); return; }
    if (dayAppts.length === 1) { setFromDayModalDate(null); setRegisteringAppt(dayAppts[0]); return; }
    setDayModalDate(dateStr);
  };

  // ✅ Abre modal desde el selector — recuerda la fecha para poder volver
  const handleSelectFromDayModal = (a) => {
    setFromDayModalDate(dayModalDate);
    setDayModalDate(null);
    setRegisteringAppt(a);
  };

  // ✅ Volver al selector desde el modal de recepción
  const handleBackToSelector = () => {
    setRegisteringAppt(null);
    setDayModalDate(fromDayModalDate);
    setFromDayModalDate(null);
  };

  // ✅ Cerrar todo
  const handleCloseReception = () => {
    setRegisteringAppt(null);
    setFromDayModalDate(null);
  };

  // ✅ Botón "Actualizar" — refresca la consulta activa
  const handleRefresh = () => {
    if (showHistory)      refetchHistory();
    else if (view === 'month') refetchMonth();
    else if (view === 'day')   refetchDay();
    else                        refetchWeek();
    showToast.success('Vista actualizada');
  };

  const fmt      = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'});
  const fmtLong  = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
  const todayDisplay = new Date().toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const applyFilters = () => setAppliedFilters({ provider_id: filterProvider||undefined, date_from: filterDateFrom||undefined, date_to: filterDateTo||undefined });
  const clearFilters = () => { setFilterProvider(''); setFilterDateFrom(''); setFilterDateTo(''); setAppliedFilters({}); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-2 border-teal-200 rounded-xl bg-gradient-to-r from-teal-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-teal-500 to-green-500">
            <FlaskConical className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recepción de Productos</h1>
            <p className="text-sm text-gray-600 capitalize">{todayDisplay}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ Botón Actualizar */}
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-700 bg-teal-100 border border-teal-300 rounded-xl hover:bg-teal-200">
            <RefreshCw className="w-4 h-4"/>Actualizar
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
              showHistory ? 'bg-teal-600 text-white border-teal-600' : 'text-teal-700 bg-teal-100 border-teal-300 hover:bg-teal-200'
            }`}>
            <History className="w-4 h-4"/>{showHistory ? 'Volver' : 'Historial'}
          </button>
        </div>
      </div>

      {/* Historial */}
      {showHistory && (
        <div className="space-y-4">
          <div className="p-4 space-y-3 bg-white border-2 border-gray-200 rounded-xl">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-500"/><h3 className="text-sm font-semibold text-gray-700">Filtros</h3></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Proveedor</label>
                <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400">
                  <option value="">Todos</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Desde</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Hasta</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={applyFilters} leftIcon={<Search className="w-3.5 h-3.5"/>} className="text-white bg-teal-600 hover:bg-teal-700">Buscar</Button>
              <Button size="sm" variant="ghost" onClick={clearFilters}>Limpiar</Button>
            </div>
          </div>
          <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <History className="w-5 h-5 text-gray-500"/>
              <div><h2 className="font-bold text-gray-700">Historial de recepciones</h2><p className="text-xs text-gray-400">{history.length} registro{history.length!==1?'s':''}</p></div>
            </div>
            <div className="p-4 space-y-3">
              {historyLoading
                ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 rounded-full border-t-teal-500 animate-spin"/></div>
                : history.length > 0
                  ? history.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={setRegisteringAppt} isPast={true}/>)
                  : <div className="py-12 text-center"><History className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No se encontraron recepciones</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Vistas */}
      {!showHistory && (
        <>
          {view === 'day' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[{label:'Entregas',value:stats.today_total||0,color:'blue'},{label:'Pendientes',value:stats.today_pending||0,color:'amber'},{label:'Aceptadas',value:stats.today_accepted||0,color:'green'},{label:'Rechazadas',value:stats.today_rejected||0,color:'red'}].map(s => (
                <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
                  <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => navigateCal(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
              <h2 className="text-lg font-bold text-gray-900 min-w-[200px] text-center capitalize">
                {view==='month' ? `${MONTHS[month]} ${year}` : view==='day' ? fmtLong(selectedDate) : `${fmt(weekDays[0])} — ${fmt(weekDays[6])}`}
              </h2>
              <button onClick={() => navigateCal(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
              <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(todayStr); setWeekStart(getWeekStart(todayStr)); }}
                className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100">Hoy</button>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {[['month','Mes',Calendar],['week','Semana',FileText],['day','Día',FlaskConical]].map(([val,label,Icon]) => (
                <button key={val} onClick={() => setView(val)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${val===view?'bg-white text-teal-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                  <Icon className="w-4 h-4"/>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Vista mes */}
          {view === 'month' && (
            <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {DAYS.map(d => <div key={d} className="py-3 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calCells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-28 bg-gray-50"/>;
                  const dateStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayAppts  = byDateMonth[dateStr] || [];
                  const dayBlocks = blocksByDate[dateStr] || [];
                  const isToday   = dateStr === todayStr;
                  const hasPending  = dayAppts.some(a => !a.is_reception_reviewed && a.status !== 'no_show' && a.status !== 'cancelled');
                  const hasRejected = dayAppts.some(a => a.reception_status === 'rejected' || a.reception_status === 'partial');
                  const hasNoShow   = dayAppts.some(a => a.status === 'no_show');
                  // ✅ Combinar bloques + citas respetando el límite visual de 3 elementos
                  const totalCount  = dayAppts.length + dayBlocks.length;
                  const shownBlocks = dayBlocks.slice(0, 1);
                  const shownAppts  = dayAppts.slice(0, 3 - shownBlocks.length);
                  const extraCount  = totalCount - shownBlocks.length - shownAppts.length;
                  return (
                    <div key={dateStr}
                      className={`h-28 p-1.5 border-b border-r border-gray-100 cursor-pointer group transition-colors ${isToday?'bg-teal-50':'bg-white hover:bg-teal-50/30'}`}
                      onClick={() => handleDayClick(dateStr)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday?'bg-teal-500 text-white':'text-gray-700 group-hover:bg-teal-100 group-hover:text-teal-700'}`}>{day}</span>
                        <div className="flex items-center gap-1">
                          {dayBlocks.length > 0 && <Ban className="w-3 h-3 text-red-500"/>}
                          {hasRejected && <span className="w-2 h-2 bg-red-400 rounded-full"/>}
                          {hasNoShow   && <span className="w-2 h-2 bg-orange-400 rounded-full"/>}
                          {hasPending  && <span className="w-2 h-2 rounded-full bg-amber-400"/>}
                          {dayAppts.length > 0 && <span className="text-xs font-bold text-gray-400">{dayAppts.length}</span>}
                        </div>
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {/* ✅ Bloqueos primero */}
                        {shownBlocks.map(b => (
                          <div key={`b-${b.id}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white bg-red-400 truncate">
                            <Ban className="w-2.5 h-2.5 flex-shrink-0"/>
                            <span className="truncate">{b.start_time} {b.title}</span>
                          </div>
                        ))}
                        {shownAppts.map(a => (
                          <div key={a.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate ${getAppointmentColor(a)}`}>
                            <span>{a.appointment_time?.slice(0,5)}</span>
                            <span className="truncate">{a.provider?.business_name}</span>
                          </div>
                        ))}
                        {extraCount > 0 && <p className="text-xs text-center text-gray-400">+{extraCount} más</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ✅ Vista semana — ahora tipo calendario, igual que el mes, con bloqueos */}
          {view === 'week' && (
            weekLoading
              ? <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 rounded-full border-t-teal-500 animate-spin"/></div>
              : (
                <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="py-3 border-r border-gray-200"/>
                    {weekDays.map((dateStr, i) => {
                      const isToday = dateStr === todayStr;
                      const d = new Date(dateStr+'T12:00:00');
                      return (
                        <div key={i} className={`py-3 text-center border-r border-gray-100 ${isToday?'bg-teal-50':''}`}>
                          <p className="text-xs font-semibold text-gray-500 uppercase">{DAYS[d.getDay()]}</p>
                          <p className={`text-lg font-bold mt-0.5 ${isToday?'text-teal-600':'text-gray-800'}`}>{d.getDate()}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="overflow-y-auto max-h-[600px]">
                    {HOURS.map(hour => (
                      <div key={hour} className="grid grid-cols-8 border-b border-gray-100 h-[56px]">
                        <div className="flex items-start px-3 pt-1.5 text-xs font-semibold text-gray-400 border-r border-gray-200">
                          {hour.endsWith(':00') ? hour : ''}
                        </div>
                        {weekDays.map((dateStr, i) => {
                          const isToday    = dateStr === todayStr;
                          const hourAppts  = (byDateWeek[dateStr] || []).filter(a => a.appointment_time?.slice(0,5) === hour);
                          const hourBlocks = (blocksByDate[dateStr] || []).filter(b => b.start_time === hour);
                          const totalItems = hourAppts.length + hourBlocks.length;
                          return (
                            <div key={i} className={`relative p-0.5 border-r border-gray-100 ${isToday?'bg-teal-50/30':''}`}>
                              {/* ✅ Bloques */}
                              {hourBlocks.map((b, bi) => {
                                const [sh,sm] = b.start_time.split(':').map(Number);
                                const [eh,em] = b.end_time.split(':').map(Number);
                                const slots   = Math.max(1, Math.round(((eh*60+em)-(sh*60+sm)) / 30));
                                const height  = slots * 56 - 4;
                                const width   = totalItems > 1 ? `${100/totalItems}%` : '95%';
                                const left    = `${(bi/totalItems)*100}%`;
                                return (
                                  <div key={`b-${b.id}`} style={{ height:`${height}px`, width, left, zIndex:10 }}
                                    className="absolute top-0.5 px-1 py-0.5 rounded-lg text-xs font-medium text-white bg-red-400 overflow-hidden">
                                    <div className="flex items-center gap-0.5"><Ban className="w-2.5 h-2.5 flex-shrink-0"/><span className="font-bold truncate">{b.title}</span></div>
                                    {slots >= 2 && <p className="text-white/80 text-[10px]">{b.start_time}–{b.end_time}</p>}
                                  </div>
                                );
                              })}
                              {/* Citas */}
                              {hourAppts.map((a, ai) => {
                                const slots  = Math.max(1, Math.round((a.duration_minutes||60) / 30));
                                const height = slots * 56 - 4;
                                const colIdx = hourBlocks.length + ai;
                                const width  = totalItems > 1 ? `${100/totalItems}%` : '95%';
                                const left   = `${(colIdx/totalItems)*100}%`;
                                const endT   = a.end_time || calcEndTime(a.appointment_time?.slice(0,5), a.duration_minutes);
                                return (
                                  <div key={a.id} onClick={() => setRegisteringAppt(a)}
                                    style={{ height:`${height}px`, width, left, zIndex:10 }}
                                    className={`absolute top-0.5 px-1.5 py-1 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-80 overflow-hidden ${getAppointmentColor(a)}`}>
                                    <p className="font-bold leading-tight">{a.appointment_time?.slice(0,5)}{endT ? ` — ${endT}` : ''}</p>
                                    <p className="leading-tight truncate">{a.provider?.business_name}</p>
                                    {a.status === 'no_show' && <p className="text-orange-100 text-[10px]">● No llegó</p>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
          )}

          {/* Vista día */}
          {view === 'day' && (
            dayLoading
              ? <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 rounded-full border-t-teal-500 animate-spin"/></div>
              : (
                <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                    <FlaskConical className="w-5 h-5 text-teal-600"/>
                    <div>
                      <h2 className="font-bold text-gray-900">Entregas del día</h2>
                      <p className="text-xs text-gray-500">{today.length} entrega{today.length!==1?'s':''} programada{today.length!==1?'s':''}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* ✅ Bloqueos del día */}
                    {(blocksByDate[selectedDate] || []).map(b => <BlockCard key={`b-${b.id}`} block={b}/>)}
                    {today.length > 0
                      ? today.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={setRegisteringAppt} isPast={false}/>)
                      : <div className="py-12 text-center"><FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No hay entregas para este día</p></div>}
                  </div>
                </div>
              )
          )}

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 bg-blue-500 rounded-full"/>Agendada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 bg-green-500 rounded-full"/>Entrada confirmada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 bg-teal-500 rounded-full"/>Aceptada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><span className="w-3 h-3 rounded-full bg-amber-500"/>Parcial</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><span className="w-3 h-3 bg-red-500 rounded-full"/>Rechazada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600"><span className="w-3 h-3 bg-orange-400 rounded-full"/>No se presentó</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-3 h-3 rounded-full bg-slate-400"/>No entregado</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 ml-2"><Ban className="w-3 h-3"/>Espacio bloqueado</span>
          </div>
        </>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 border border-blue-200 bg-blue-50 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">
          Haz clic en un día para ver sus entregas. Si hay varias, puedes elegir cuál revisar y volver a la lista con el botón "Atrás".
        </p>
      </div>

      {/* ✅ Modales con navegación */}
      {dayModalDate && (
        <DayAppointmentsModal
          dateStr={dayModalDate}
          appointments={byDateMonth[dayModalDate] || []}
          blocks={blocksByDate[dayModalDate] || []}
          onSelect={handleSelectFromDayModal}
          onClose={() => setDayModalDate(null)}
        />
      )}
      {registeringAppt && (
        <ReceptionModal
          appointment={registeringAppt}
          onClose={handleCloseReception}
          onBack={fromDayModalDate ? handleBackToSelector : undefined}
        />
      )}
    </div>
  );
};
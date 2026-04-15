import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  FlaskConical, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  X, AlertCircle, History, Info, Search, Filter, Package, Calendar,
  ChevronLeft, ChevronRight, Wrench, UserX, Shield, FileText,
} from 'lucide-react';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const REJECTION_REASONS = [
  { value: 'inocuidad', label: 'Inocuidad' },
  { value: 'calidad',   label: 'Calidad'   },
];

// ─── Helpers de color ─────────────────────────────────────────────────────────
const getAppointmentColor = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-400';
  if (a.status === 'cancelled')                                      return 'bg-red-300';
  if (a.reception_status === 'rejected')                             return 'bg-red-500';
  if (a.reception_status === 'partial')                              return 'bg-amber-500';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-500';
  if (a.status === 'confirmed')                                      return 'bg-green-500';
  return 'bg-blue-500';
};

const getHourBlockColor = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-100 text-orange-700';
  if (a.reception_status === 'rejected')                             return 'bg-red-100 text-red-700';
  if (a.reception_status === 'partial')                              return 'bg-amber-100 text-amber-700';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-800';
};

const getCardBorder = (a) => {
  if (a.status === 'no_show')                                        return 'border-orange-200 bg-orange-50/20';
  if (a.reception_status === 'rejected')                             return 'border-red-200 bg-red-50/20';
  if (a.reception_status === 'partial')                              return 'border-amber-200 bg-amber-50/20';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'border-teal-200 bg-teal-50/20';
  return 'border-gray-200 bg-white shadow-sm hover:shadow-md';
};

// ─── Fila de item en el modal de recepción ────────────────────────────────────
const ItemReceptionRow = ({ item, units, onChange }) => {
  const qtyRec = parseFloat(item.quantity_received) || 0;
  const qtyRej = parseFloat(item.quantity_rejected) || 0;
  const qtyAcc = Math.max(0, qtyRec - qtyRej);
  const isPartial  = qtyRej > 0 && qtyRej < qtyRec;
  const isRejected = qtyRej >= qtyRec && qtyRec > 0;
  const selectedUnit = units.find(u => u.id === parseInt(item.received_unit_id));
  const unitAbbr = selectedUnit?.abbreviation || '';

  return (
    <div className={`p-4 rounded-xl border-2 space-y-3 ${
      isRejected ? 'border-red-200 bg-red-50/30' :
      isPartial  ? 'border-amber-200 bg-amber-50/30' :
      qtyRec > 0 ? 'border-teal-200 bg-teal-50/20' :
      'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center gap-2">
        {item.product_type === 'product'
          ? <Package className="w-4 h-4 text-primary-500 flex-shrink-0"/>
          : <Wrench   className="w-4 h-4 text-teal-500 flex-shrink-0"/>}
        <p className="text-sm font-bold text-gray-900">{item.product_name}</p>
        {item.quantity_expected && (
          <span className="ml-auto text-xs text-gray-400 font-medium whitespace-nowrap">
            Esperado: {item.quantity_expected} {item.unit?.abbreviation}
          </span>
        )}
      </div>

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
          <div className="flex gap-2 items-center">
            <input type="number" value={item.quantity_rejected} min="0" max={item.quantity_received} step="0.01" placeholder="0"
              onChange={e => onChange('quantity_rejected', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
            {unitAbbr && <span className="text-xs text-gray-500 font-medium">{unitAbbr}</span>}
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

      <div>
        <label className="block mb-1 text-xs font-semibold text-gray-500">
          Observaciones {qtyRej > 0 ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-400">(opcional)</span>}
        </label>
        <textarea value={item.reception_notes} onChange={e => onChange('reception_notes', e.target.value)}
          rows={2} maxLength={500}
          placeholder={qtyRej > 0 ? 'Describe el problema...' : 'Condiciones, temperatura, observaciones...'}
          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 resize-none"/>
      </div>
    </div>
  );
};

// ─── Modal selector de citas del día ─────────────────────────────────────────
const DayAppointmentsModal = ({ dateStr, appointments, onSelect, onClose }) => {
  const dateDisplay = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  const getStatusBadge = (a) => {
    if (a.status === 'no_show')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>;
    if (!a.is_entry_confirmed)
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Shield className="w-3 h-3"/>Espera Seguridad</span>;
    if (a.is_reception_reviewed) {
      if (a.reception_status === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rechazado</span>;
      if (a.reception_status === 'partial')  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3"/>Parcial</span>;
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><CheckCircle className="w-3 h-3"/>Aceptado</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Listo para recibir</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-green-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-green-500 shadow-md">
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
          <p className="text-xs text-gray-500 mb-3">Selecciona la entrega que deseas revisar:</p>
          {appointments.map(a => (
            <button key={a.id} type="button" onClick={() => onSelect(a)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left group">
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
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 flex-shrink-0"/>
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
    }))
  );
 
  const updateItem = (idx, field, value) =>
    setItemsState(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
 
  const mutation = useMutation({
    mutationFn: () => appointmentService.registerReception(appointment.id, {
      reception_notes: globalNotes || undefined,
      items: itemsState.map(item => ({
        id:                item.id,
        quantity_received: item.quantity_received,
        received_unit_id:  item.received_unit_id,
        quantity_rejected: parseFloat(item.quantity_rejected) > 0 ? item.quantity_rejected : undefined,
        rejection_reason:  item.rejection_reason || undefined,
        reception_notes:   item.reception_notes  || undefined,
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
      const item   = itemsState[i];
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
 
  const hasAnyRejection = itemsState.some(i => parseFloat(i.quantity_rejected) > 0);
  const allRejected     = itemsState.every(i => { const r = parseFloat(i.quantity_received)||0; const j = parseFloat(i.quantity_rejected)||0; return r > 0 && j >= r; });
 
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
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-white/60 hover:text-gray-700 transition-colors">
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
              <div className="p-5 rounded-xl border-2 border-orange-300 bg-orange-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl flex-shrink-0">
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
                    <p className="text-sm text-orange-700 italic">"{appointment.no_show_notes}"</p>
                  </div>
                )}
                <p className="text-xs text-orange-600 pt-2 border-t border-orange-200">
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
              <div className="p-5 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl flex-shrink-0">
                    <Shield className="w-6 h-6 text-amber-600"/>
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-800">Esperando confirmación de Seguridad</p>
                    <p className="text-sm text-amber-600 mt-0.5">El proveedor aún no ha sido registrado como ingresado.</p>
                  </div>
                </div>
                {appointment.items?.length > 0 && (
                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-xs text-amber-600 font-semibold mb-2">Productos agendados:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {appointment.items.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-amber-100 text-amber-800 border border-amber-200">
                          {item.product_type === 'product' ? <Package className="w-3 h-3"/> : <Wrench className="w-3 h-3"/>}
                          {item.product_name}
                          {item.quantity_expected && <span className="text-amber-500">· {item.quantity_expected} {item.unit?.abbreviation}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-amber-600 pt-2 border-t border-amber-200">
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
                appointment.reception_status === 'rejected' ? 'border-red-200 bg-red-50' :
                appointment.reception_status === 'partial'  ? 'border-amber-200 bg-amber-50' :
                'border-teal-200 bg-teal-50'
              }`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${
                  appointment.reception_status === 'rejected' ? 'bg-red-100' :
                  appointment.reception_status === 'partial'  ? 'bg-amber-100' :
                  'bg-teal-100'
                }`}>
                  {appointment.reception_status === 'rejected'
                    ? <XCircle className="w-5 h-5 text-red-600"/>
                    : appointment.reception_status === 'partial'
                      ? <AlertCircle className="w-5 h-5 text-amber-600"/>
                      : <CheckCircle className="w-5 h-5 text-teal-600"/>}
                </div>
                <div>
                  <p className={`text-sm font-bold ${
                    appointment.reception_status === 'rejected' ? 'text-red-800' :
                    appointment.reception_status === 'partial'  ? 'text-amber-800' :
                    'text-teal-800'
                  }`}>
                    {appointment.reception_status === 'rejected' ? 'Recepción rechazada' :
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
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalle por producto</p>
                  {appointment.items.map(item => {
                    const rec  = parseFloat(item.quantity_received) || 0;
                    const rej  = parseFloat(item.quantity_rejected)  || 0;
                    const acc  = Math.max(0, rec - rej);
                    const abbr = item.received_unit?.abbreviation || item.unit?.abbreviation || '';
                    const s    = item.reception_status;
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
                        {item.rejection_reason_label && <p className="text-xs text-gray-500 mt-1">Motivo: {item.rejection_reason_label}</p>}
                        {item.reception_notes && <p className="text-xs text-gray-600 mt-1 italic">"{item.reception_notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
 
              {appointment.reception_notes && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Observaciones generales</p>
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
                <div className="p-6 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
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
        <div className="flex items-center gap-4 flex-1 min-w-0">
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
              {!isNoShow && appointment.is_entry_confirmed && !isReviewed && !isPast && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Listo para recibir</span>}
            </div>
            {hasItems && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {appointment.items.slice(0,3).map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-gray-100 text-gray-600">
                    {item.product_type === 'product' ? <Package className="w-2.5 h-2.5"/> : <Wrench className="w-2.5 h-2.5"/>}
                    {item.product_name}
                    {item.quantity_expected && <span className="text-gray-400">· {item.quantity_expected} {item.unit?.abbreviation}</span>}
                  </span>
                ))}
                {appointment.items.length > 3 && <span className="text-xs text-gray-400">+{appointment.items.length-3} más</span>}
              </div>
            )}
            {isReviewed && <p className="text-xs text-gray-400 mt-1">Por {appointment.reception_reviewed_by} · {appointment.reception_reviewed_at}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detalle por producto</p>
          {appointment.items.map(item => {
            const rec  = parseFloat(item.quantity_received) || 0;
            const rej  = parseFloat(item.quantity_rejected) || 0;
            const acc  = Math.max(0, rec - rej);
            const abbr = item.received_unit?.abbreviation || item.unit?.abbreviation || '';
            const s    = item.reception_status;
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
                {item.rejection_reason_label && <p className="text-xs text-gray-500 mt-1">Motivo: {item.rejection_reason_label}</p>}
                {item.reception_notes && <p className="text-xs text-gray-600 mt-1 italic">"{item.reception_notes}"</p>}
              </div>
            );
          })}
          {appointment.reception_notes && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Observaciones generales</p>
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

  const { data: monthData } = useQuery({
    queryKey: ['food-engineer-month', year, month+1],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ year, month: month+1 }),
    enabled: view === 'month',
    staleTime: 60 * 1000,
  });

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ['food-engineer-day', selectedDate],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ date: selectedDate }),
    enabled: view === 'day',
    refetchInterval: 60 * 1000,
  });

  const getWeekStart = (dateStr) => { const d = new Date(dateStr); d.setDate(d.getDate()-d.getDay()); return d.toLocaleDateString('en-CA'); };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d.toLocaleDateString('en-CA'); });

  const { data: weekData, isLoading: weekLoading } = useQuery({
    queryKey: ['food-engineer-week', weekStart],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ view: 'week', week_start: weekStart }),
    enabled: view === 'week',
    refetchInterval: 60 * 1000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['food-engineer-history', appliedFilters],
    queryFn: () => appointmentService.foodEngineerGetAppointments(appliedFilters),
    enabled: showHistory,
  });

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

  const fmt      = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'});
  const fmtLong  = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
  const todayDisplay = new Date().toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const applyFilters = () => setAppliedFilters({ provider_id: filterProvider||undefined, date_from: filterDateFrom||undefined, date_to: filterDateTo||undefined });
  const clearFilters = () => { setFilterProvider(''); setFilterDateFrom(''); setFilterDateTo(''); setAppliedFilters({}); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-teal-50 to-green-50 border-teal-200 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-teal-500 to-green-500">
            <FlaskConical className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recepción de Productos</h1>
            <p className="text-sm text-gray-600 capitalize">{todayDisplay}</p>
          </div>
        </div>
        <button onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
            showHistory ? 'bg-teal-600 text-white border-teal-600' : 'text-teal-700 bg-teal-100 border-teal-300 hover:bg-teal-200'
          }`}>
          <History className="w-4 h-4"/>{showHistory ? 'Volver' : 'Historial'}
        </button>
      </div>

      {/* Historial */}
      {showHistory && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-500"/><h3 className="text-sm font-semibold text-gray-700">Filtros</h3></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</label>
                <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400">
                  <option value="">Todos</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Desde</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hasta</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={applyFilters} leftIcon={<Search className="w-3.5 h-3.5"/>} className="bg-teal-600 hover:bg-teal-700 text-white">Buscar</Button>
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
                ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-t-teal-500 rounded-full animate-spin"/></div>
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
          <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl flex-wrap gap-3">
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
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {DAYS.map(d => <div key={d} className="py-3 text-xs font-bold text-center text-gray-500 uppercase tracking-wide">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calCells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="h-28 bg-gray-50 border-b border-r border-gray-100"/>;
                  const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayAppts = byDateMonth[dateStr] || [];
                  const isToday  = dateStr === todayStr;
                  const hasPending  = dayAppts.some(a => !a.is_reception_reviewed && a.status !== 'no_show' && a.status !== 'cancelled');
                  const hasRejected = dayAppts.some(a => a.reception_status === 'rejected' || a.reception_status === 'partial');
                  const hasNoShow   = dayAppts.some(a => a.status === 'no_show');
                  return (
                    <div key={dateStr}
                      className={`h-28 p-1.5 border-b border-r border-gray-100 cursor-pointer group transition-colors ${isToday?'bg-teal-50':'bg-white hover:bg-teal-50/30'}`}
                      onClick={() => handleDayClick(dateStr)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday?'bg-teal-500 text-white':'text-gray-700 group-hover:bg-teal-100 group-hover:text-teal-700'}`}>{day}</span>
                        <div className="flex items-center gap-1">
                          {hasRejected && <span className="w-2 h-2 rounded-full bg-red-400"/>}
                          {hasNoShow   && <span className="w-2 h-2 rounded-full bg-orange-400"/>}
                          {hasPending  && <span className="w-2 h-2 rounded-full bg-amber-400"/>}
                          {dayAppts.length > 0 && <span className="text-xs font-bold text-gray-400">{dayAppts.length}</span>}
                        </div>
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayAppts.slice(0,3).map(a => (
                          <div key={a.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate ${getAppointmentColor(a)}`}>
                            <span>{a.appointment_time?.slice(0,5)}</span>
                            <span className="truncate">{a.provider?.business_name}</span>
                          </div>
                        ))}
                        {dayAppts.length > 3 && <p className="text-xs text-gray-400 text-center">+{dayAppts.length-3} más</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vista semana */}
          {view === 'week' && (
            weekLoading
              ? <div className="flex justify-center h-48 items-center"><div className="w-10 h-10 border-4 border-t-teal-500 rounded-full animate-spin"/></div>
              : (
                <div className="space-y-3">
                  {weekDays.map(dateStr => {
                    const dayAppts = byDateWeek[dateStr] || [];
                    const isToday  = dateStr === todayStr;
                    return (
                      <div key={dateStr} className={`bg-white border-2 rounded-xl ${isToday?'border-teal-300':'border-gray-200'}`}>
                        <div className={`flex items-center justify-between px-6 py-3 border-b rounded-t-xl ${isToday?'bg-teal-50 border-teal-200':'border-gray-100 bg-gray-50'}`}>
                          <h3 className={`font-bold capitalize text-sm ${isToday?'text-teal-700':'text-gray-700'}`}>
                            {fmtLong(dateStr)}{isToday && <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-500 text-white rounded-md">Hoy</span>}
                          </h3>
                          <span className="text-xs text-gray-500">{dayAppts.length} entrega{dayAppts.length!==1?'s':''}</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {dayAppts.length > 0
                            ? dayAppts.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={setRegisteringAppt} isPast={false}/>)
                            : <p className="py-4 text-sm text-center text-gray-400">Sin entregas</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          )}

          {/* Vista día */}
          {view === 'day' && (
            dayLoading
              ? <div className="flex justify-center h-48 items-center"><div className="w-10 h-10 border-4 border-t-teal-500 rounded-full animate-spin"/></div>
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
                    {today.length > 0
                      ? today.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={setRegisteringAppt} isPast={false}/>)
                      : <div className="py-12 text-center"><FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No hay entregas para este día</p></div>}
                  </div>
                </div>
              )
          )}

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-blue-500"/>Agendada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-green-500"/>Entrada confirmada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-teal-500"/>Aceptada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><span className="w-3 h-3 rounded-full bg-amber-500"/>Parcial</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><span className="w-3 h-3 rounded-full bg-red-500"/>Rechazada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600"><span className="w-3 h-3 rounded-full bg-orange-400"/>No se presentó</span>
          </div>
        </>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
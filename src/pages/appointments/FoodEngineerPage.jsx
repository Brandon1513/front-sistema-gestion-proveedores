import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  FlaskConical, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  X, AlertCircle, Truck, User, FileText, Camera, History,
  Info, Search, Filter, Package, Scale,
} from 'lucide-react';

const REJECTION_REASONS = [
  { value: 'inocuidad', label: 'Inocuidad' },
  { value: 'calidad',   label: 'Calidad'   },
];

// ─── Modal registrar recepción ────────────────────────────────────────────────
const ReceptionModal = ({ appointment, onClose }) => {
  const queryClient = useQueryClient();
  const [status,     setStatus]     = useState('');
  const [notes,      setNotes]      = useState('');
  const [qtyRec,     setQtyRec]     = useState('');
  const [qtyRej,     setQtyRej]     = useState('');
  const [unitId,     setUnitId]     = useState('');
  const [reason,     setReason]     = useState('');
  const [photos,     setPhotos]     = useState([]);
  const [error,      setError]      = useState('');

  // Cargar unidades
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: appointmentService.getUnits,
    staleTime: 10 * 60 * 1000,
  });
  const units = unitsData?.units || [];

  const qtyRecNum = parseFloat(qtyRec) || 0;
  const qtyRejNum = parseFloat(qtyRej) || 0;
  const qtyAccepted = Math.max(0, qtyRecNum - qtyRejNum);
  const isPartial   = qtyRejNum > 0 && qtyRejNum < qtyRecNum;
  const isFullReject = status === 'rejected' && qtyRejNum >= qtyRecNum;

  const mutation = useMutation({
    mutationFn: () => appointmentService.registerReception(appointment.id, {
      reception_status:  status,
      quantity_received: qtyRec,
      unit_id:           unitId,
      quantity_rejected: qtyRejNum > 0 ? qtyRej : undefined,
      rejection_reason:  reason || undefined,
      reception_notes:   notes || undefined,
      photos,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['food-engineer-appointments']);
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
    if (!status)  { setError('Selecciona si el producto fue aceptado o rechazado'); return; }
    if (!qtyRec || qtyRecNum <= 0) { setError('Ingresa la cantidad recibida'); return; }
    if (!unitId)  { setError('Selecciona la unidad de medida'); return; }
    if (status === 'rejected') {
      if (!reason) { setError('Selecciona el motivo del rechazo'); return; }
      if (!notes.trim()) { setError('Las observaciones son obligatorias al rechazar'); return; }
    }
    if (qtyRejNum > qtyRecNum) { setError('La cantidad rechazada no puede superar la recibida'); return; }
    mutation.mutate();
  };

  const selectedUnit = units.find(u => u.id === parseInt(unitId));
  const unitAbbr = selectedUnit?.abbreviation || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-green-50 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-green-500 shadow-md">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registrar recepción</h2>
              <p className="text-xs text-gray-500">{appointment.provider?.business_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info producto */}
          {appointment.products && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Productos / descripción</p>
                <p className="text-sm text-gray-800">{appointment.products}</p>
              </div>
            </div>
          )}

          {/* Resultado */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Resultado *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val:'accepted', label:'Producto aceptado', icon:CheckCircle, colors:'border-green-500 bg-green-50 text-green-700', inactive:'border-gray-200 hover:border-green-300' },
                { val:'rejected', label:'Producto rechazado', icon:XCircle,    colors:'border-red-500 bg-red-50 text-red-700',       inactive:'border-gray-200 hover:border-red-300' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setStatus(opt.val)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                    status === opt.val ? opt.colors : `text-gray-600 ${opt.inactive}`
                  }`}>
                  <opt.icon className="w-5 h-5" />{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad recibida + unidad */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              <Scale className="inline w-4 h-4 mr-1 text-teal-600" />
              Cantidad recibida *
            </label>
            <div className="flex gap-2">
              <input type="number" value={qtyRec} onChange={e => setQtyRec(e.target.value)}
                min="0.01" step="0.01" placeholder="Ej. 100"
                className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400" />
              <select value={unitId} onChange={e => setUnitId(e.target.value)}
                className="w-32 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400">
                <option value="">Unidad</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.abbreviation} — {u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cantidad rechazada — solo si hay resultado */}
          {status && qtyRecNum > 0 && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                Cantidad rechazada / devuelta al proveedor
                <span className="font-normal text-gray-400 ml-1">(dejar en 0 si se recibió todo)</span>
              </label>
              <div className="flex gap-2 items-center">
                <input type="number" value={qtyRej} onChange={e => setQtyRej(e.target.value)}
                  min="0" max={qtyRec} step="0.01" placeholder="0"
                  className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400" />
                {unitAbbr && <span className="text-sm text-gray-500 font-medium">{unitAbbr}</span>}
              </div>

              {/* Resumen visual */}
              {qtyRecNum > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                    <p className="text-xs text-blue-500">Total llegó</p>
                    <p className="text-sm font-bold text-blue-800">{qtyRec} {unitAbbr}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-center">
                    <p className="text-xs text-green-500">Se acepta</p>
                    <p className="text-sm font-bold text-green-800">{qtyAccepted.toFixed(2)} {unitAbbr}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
                    <p className="text-xs text-red-500">Se devuelve</p>
                    <p className="text-sm font-bold text-red-800">{qtyRejNum.toFixed(2)} {unitAbbr}</p>
                  </div>
                </div>
              )}

              {/* Badge rechazo parcial */}
              {isPartial && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    Recepción parcial — la cita se marcará como aceptada con devolución
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Motivo de rechazo — si hay algo rechazado */}
          {(status === 'rejected' || qtyRejNum > 0) && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                Motivo del rechazo *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REJECTION_REASONS.map(r => (
                  <button key={r.value} type="button" onClick={() => setReason(r.value)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      reason === r.value
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Observaciones
              {(status === 'rejected' || qtyRejNum > 0) && <span className="text-red-500 ml-1">*</span>}
              {status === 'accepted' && qtyRejNum === 0 && <span className="font-normal text-gray-400 ml-1">(opcional)</span>}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000}
              placeholder={
                status === 'rejected' || qtyRejNum > 0
                  ? 'Describe el problema: temperatura fuera de rango, empaque dañado, olor anormal...'
                  : 'Temperatura de recepción, condiciones del embalaje...'
              }
              className={`w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none resize-none transition-colors ${
                (status === 'rejected' || qtyRejNum > 0) && !notes.trim()
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-teal-400'
              }`} />
          </div>

          {/* Fotos */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              <Camera className="inline w-4 h-4 mr-1 text-teal-600" />
              Fotos <span className="font-normal text-gray-400">(opcional, máx. 5)</span>
            </label>
            <input type="file" accept="image/*" multiple
              onChange={e => setPhotos(Array.from(e.target.files).slice(0, 5))}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
            {photos.length > 0 && <p className="mt-1 text-xs text-teal-600">{photos.length} foto(s) seleccionada(s)</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending}
              className={`flex-1 text-white font-semibold py-2.5 rounded-xl ${
                status === 'rejected' && !isPartial
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600'
              }`}>
              {status === 'rejected' && !isPartial ? 'Registrar rechazo total' :
               isPartial ? 'Registrar recepción parcial' : 'Registrar aceptación'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Tarjeta de entrega ───────────────────────────────────────────────────────
const DeliveryCard = ({ appointment, onRegister, isPast = false }) => {
  const [expanded, setExpanded] = useState(false);
  const isReviewed  = appointment.is_reception_reviewed;
  const isAccepted  = appointment.reception_status === 'accepted';
  const isRejected  = appointment.reception_status === 'rejected';
  const isPartial   = appointment.is_partial_rejection;

  return (
    <div className={`rounded-xl border-2 transition-all ${
      isAccepted && isPartial ? 'border-amber-200 bg-amber-50/20' :
      isAccepted  ? 'border-green-200 bg-green-50/20' :
      isRejected  ? 'border-red-200 bg-red-50/20' :
      isPast      ? 'border-gray-200 bg-white' :
      'border-teal-200 bg-white shadow-sm hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Hora */}
          <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl font-bold text-lg ${
            isAccepted && isPartial ? 'bg-amber-100 text-amber-700' :
            isAccepted  ? 'bg-green-100 text-green-700' :
            isRejected  ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-800'
          }`}>
            {appointment.appointment_time?.slice(0,5)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-bold text-gray-900 truncate">{appointment.provider?.business_name}</p>

              {/* Estado */}
              {isAccepted && isPartial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />Parcial
                </span>
              )}
              {isAccepted && !isPartial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" />Aceptado
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <XCircle className="w-3 h-3" />Rechazado
                </span>
              )}
              {!isReviewed && !isPast && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  <Clock className="w-3 h-3" />Pendiente
                </span>
              )}
            </div>

            {appointment.products && <p className="text-sm text-gray-600 truncate">{appointment.products}</p>}

            {/* Resumen cantidades — si ya fue revisado */}
            {isReviewed && appointment.quantity_received && (
              <div className="flex flex-wrap gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Package className="w-3 h-3 text-blue-400" />
                  Recibido: <strong>{appointment.quantity_received} {appointment.unit?.abbreviation}</strong>
                </span>
                {appointment.quantity_rejected > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <XCircle className="w-3 h-3" />
                    Devuelto: <strong>{appointment.quantity_rejected} {appointment.unit?.abbreviation}</strong>
                  </span>
                )}
                {appointment.rejection_reason_label && (
                  <span className="text-xs text-gray-500">· Motivo: {appointment.rejection_reason_label}</span>
                )}
              </div>
            )}

            {isReviewed && <p className="text-xs text-gray-400 mt-0.5">Por {appointment.reception_reviewed_by} · {appointment.reception_reviewed_at}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {!isReviewed && !isPast && (
            <Button size="sm" onClick={() => onRegister(appointment)}
              leftIcon={<FlaskConical className="w-3.5 h-3.5" />}
              className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white font-semibold whitespace-nowrap">
              Revisar
            </Button>
          )}
          {isReviewed && (
            <button onClick={() => setExpanded(!expanded)} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Detalle expandible */}
      {expanded && isReviewed && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3 mt-1 pt-3">
          {/* Cantidades detalladas */}
          {appointment.quantity_received && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p className="text-xs text-blue-500">Total llegó</p>
                <p className="text-sm font-bold text-blue-800">{appointment.quantity_received} {appointment.unit?.abbreviation}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-green-500">Aceptado</p>
                <p className="text-sm font-bold text-green-800">
                  {(parseFloat(appointment.quantity_received) - parseFloat(appointment.quantity_rejected || 0)).toFixed(2)} {appointment.unit?.abbreviation}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-xs text-red-500">Devuelto</p>
                <p className="text-sm font-bold text-red-800">{appointment.quantity_rejected || '0'} {appointment.unit?.abbreviation}</p>
              </div>
            </div>
          )}

          {appointment.reception_notes && (
            <div className={`p-3 rounded-lg border ${isRejected || isPartial ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${isRejected || isPartial ? 'text-red-600' : 'text-green-600'}`}>
                {isRejected || isPartial ? 'Observaciones del rechazo' : 'Observaciones'}
              </p>
              <p className={`text-sm ${isRejected || isPartial ? 'text-red-800' : 'text-green-800'}`}>
                {appointment.reception_notes}
              </p>
            </div>
          )}

          {appointment.reception_photos?.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Camera className="w-4 h-4 text-gray-400" />
              <span>{appointment.reception_photos.length} foto(s) adjunta(s)</span>
            </div>
          )}

          {(appointment.vehicle_display || appointment.driver_display) && (
            <div className="flex flex-wrap gap-3">
              {appointment.vehicle_display && <span className="flex items-center gap-1 text-xs text-gray-500"><Truck className="w-3.5 h-3.5"/>{appointment.vehicle_display}</span>}
              {appointment.driver_display  && <span className="flex items-center gap-1 text-xs text-gray-500"><User className="w-3.5 h-3.5"/>{appointment.driver_display}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const FoodEngineerPage = () => {
  const [registeringAppt, setRegisteringAppt] = useState(null);
  const [showHistory,     setShowHistory]     = useState(false);

  // Filtros del historial
  const [filterProvider, setFilterProvider] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['food-engineer-appointments', appliedFilters],
    queryFn: () => appointmentService.foodEngineerGetAppointments(appliedFilters),
    refetchInterval: 60 * 1000,
  });

  const today    = data?.today    || [];
  const history  = data?.history  || [];
  const providers = data?.providers || [];
  const stats    = data?.stats    || {};

  const applyFilters = () => {
    setAppliedFilters({
      provider_id: filterProvider || undefined,
      date_from:   filterDateFrom || undefined,
      date_to:     filterDateTo   || undefined,
    });
  };

  const clearFilters = () => {
    setFilterProvider(''); setFilterDateFrom(''); setFilterDateTo('');
    setAppliedFilters({});
  };

  const todayStr = new Date().toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-teal-500 border-r-teal-500 border-b-transparent border-l-transparent animate-spin"/>
        <p className="text-gray-600">Cargando entregas...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-teal-50 to-green-50 border-teal-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-teal-500 to-green-500">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recepción de Productos</h1>
            <p className="text-sm text-gray-600 capitalize">{todayStr}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
              showHistory ? 'bg-teal-600 text-white border-teal-600' : 'text-teal-700 bg-teal-100 border-teal-300 hover:bg-teal-200'
            }`}>
            <History className="w-4 h-4" />{showHistory ? 'Ver hoy' : 'Historial'}
          </button>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-700 bg-teal-100 border border-teal-300 rounded-xl hover:bg-teal-200">
            <Clock className="w-4 h-4" />Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {label:'Entregas hoy', value:stats.today_total||0,    color:'blue' },
          {label:'Pendientes',   value:stats.today_pending||0,  color:'amber'},
          {label:'Aceptadas',    value:stats.today_accepted||0, color:'green'},
          {label:'Rechazadas',   value:stats.today_rejected||0, color:'red'  },
        ].map(s=>(
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Vista hoy */}
      {!showHistory && (
        <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-center w-8 h-8 bg-teal-100 rounded-lg">
              <FlaskConical className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Entregas de hoy</h2>
              <p className="text-xs text-gray-500">{today.length} entrega{today.length!==1?'s':''} programada{today.length!==1?'s':''}</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {today.length > 0 ? (
              today.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={setRegisteringAppt} isPast={false}/>)
            ) : (
              <div className="py-12 text-center">
                <FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                <p className="font-medium text-gray-500">No hay entregas programadas para hoy</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial con filtros */}
      {showHistory && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500"/>
              <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</label>
                <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400">
                  <option value="">Todos los proveedores</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha desde</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha hasta</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400"/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={applyFilters} leftIcon={<Search className="w-3.5 h-3.5"/>}
                className="bg-teal-600 hover:bg-teal-700 text-white">
                Buscar
              </Button>
              <Button size="sm" variant="ghost" onClick={clearFilters}>Limpiar</Button>
            </div>
          </div>

          {/* Resultados historial */}
          <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                <History className="w-4 h-4 text-gray-500"/>
              </div>
              <div>
                <h2 className="font-bold text-gray-700">Historial de recepciones</h2>
                <p className="text-xs text-gray-400">{history.length} registro{history.length!==1?'s':''} encontrado{history.length!==1?'s':''}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {history.length > 0 ? (
                history.map(a => <DeliveryCard key={a.id} appointment={a} onRegister={() => {}} isPast={true}/>)
              ) : (
                <div className="py-12 text-center">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                  <p className="font-medium text-gray-500">No se encontraron recepciones</p>
                  <p className="text-sm text-gray-400 mt-1">Ajusta los filtros y busca de nuevo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">
          Registra las cantidades recibidas y devueltas. Los rechazos parciales quedan registrados como aceptados con devolución. La página se actualiza automáticamente cada minuto.
        </p>
      </div>

      {registeringAppt && (
        <ReceptionModal appointment={registeringAppt} onClose={() => setRegisteringAppt(null)}/>
      )}
    </div>
  );
};
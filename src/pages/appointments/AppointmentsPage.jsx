import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { providerService } from '../../api/providerService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/axios';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, X,
  Building2, FileText, Download, CheckCircle, XCircle,
  LayoutGrid, List, Tag, Paperclip, AlertCircle, Truck,
  User, Info, ShieldCheck, ShieldX, Timer, Package,
  Wrench, Trash2, FlaskConical, RefreshCw, Ban,
} from 'lucide-react';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const HOURS = Array.from({ length: 25 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30;
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
});

const TYPE_OPTIONS = [
  { value: 'entrega',     label: 'Entrega de mercancía',    color: 'bg-blue-500'   },
  { value: 'residuos',    label: 'Recolección de residuos', color: 'bg-green-500'  },
  { value: 'auditoria',   label: 'Auditoría / Calidad',     color: 'bg-purple-500' },
  { value: 'calibracion', label: 'Calibración de equipos',  color: 'bg-amber-500'  },
  { value: 'servicio',    label: 'Servicio general',        color: 'bg-gray-500'   },
];

const STATUS_CONFIG = {
  scheduled: { label: 'Agendada',       color: 'bg-blue-100 text-blue-800',    icon: Clock        },
  confirmed: { label: 'Confirmada',     color: 'bg-green-100 text-green-800',  icon: CheckCircle  },
  cancelled: { label: 'Cancelada',      color: 'bg-red-100 text-red-800',      icon: XCircle      },
  completed: { label: 'Completada',     color: 'bg-gray-100 text-gray-800',    icon: CheckCircle  },
  no_show:   { label: 'No se presentó', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
};

const typeColor = (type) => TYPE_OPTIONS.find(t => t.value === type)?.color || 'bg-gray-500';

const calcEndTime = (startTime, durationMins) => {
  if (!startTime || !durationMins) return null;
  const clean = startTime.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  const total  = h * 60 + m + Number(durationMins);
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
};

// ─── Hook elegibilidad ────────────────────────────────────────────────────────
const useProviderEligibility = (providerId) => useQuery({
  queryKey: ['provider-eligibility', providerId],
  queryFn: async () => {
    if (!providerId) return null;
    const provRes  = await api.get(`/providers/${providerId}`);
    const provider = provRes.data?.provider || provRes.data;
    const docsRes  = await api.get(`/providers/${providerId}/documents/required`);
    const required = docsRes.data?.required_documents || [];
    const issues   = [];
    if (provider.status !== 'active') issues.push(`Proveedor en estado "${provider.status}"`);
    const notApproved = required.filter(d => d.is_required && (!d.uploaded || d.uploaded_document?.status !== 'approved'));
    if (notApproved.length > 0)
      issues.push(`Documentos sin aprobar: ${notApproved.slice(0,3).map(d=>d.name).join(', ')}${notApproved.length>3?` y ${notApproved.length-3} más`:''}`);
    return { eligible: issues.length === 0, issues, provider };
  },
  enabled: !!providerId, staleTime: 2*60*1000, retry: false,
});

// ─── Items selector ───────────────────────────────────────────────────────────
const ItemsSelector = ({ providerId, items, setItems, units }) => {
  const { data: providerProducts, isLoading } = useQuery({
    queryKey: ['provider-appointment-products', providerId],
    queryFn: () => appointmentService.getProviderProducts(providerId),
    enabled: !!providerId, staleTime: 5*60*1000,
  });
  const allItems   = useMemo(() => [...(providerProducts?.products||[]), ...(providerProducts?.services||[])], [providerProducts]);
  const addItem    = (p) => { if (items.some(i => i.product_service_id === p.id)) return; setItems(prev => [...prev, { product_service_id: p.id, product_name: p.name, product_type: p.type, quantity_expected: '', unit_id: '' }]); };
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  if (!providerId) return <div className="p-4 text-sm text-center text-gray-400 border-2 border-gray-200 border-dashed rounded-xl">Selecciona un proveedor para ver sus productos y servicios</div>;
  if (isLoading)   return <div className="flex items-center gap-2 p-3 text-sm text-gray-500"><div className="w-4 h-4 border-2 rounded-full border-t-primary-600 animate-spin"/>Cargando...</div>;
  if (allItems.length === 0) return <div className="p-4 text-sm text-center border-2 text-amber-600 border-amber-200 rounded-xl bg-amber-50"><AlertCircle className="inline w-4 h-4 mr-1"/>Este proveedor no tiene productos o servicios asignados.</div>;

  return (
    <div className="space-y-3">
      <div className="overflow-y-auto border-2 border-gray-200 divide-y divide-gray-100 max-h-40 rounded-xl">
        {allItems.map(p => { const already = items.some(i => i.product_service_id === p.id); return (
          <button key={p.id} type="button" onClick={() => addItem(p)} disabled={already}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${already ? 'bg-primary-50 text-primary-600' : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
            <div className="flex items-center gap-2">
              {p.type === 'product' ? <Package className="w-3.5 h-3.5 text-primary-400 flex-shrink-0"/> : <Wrench className="w-3.5 h-3.5 text-teal-400 flex-shrink-0"/>}
              <span className="text-sm font-medium">{p.name}</span>
            </div>
            {already ? <CheckCircle className="w-4 h-4 text-primary-500"/> : <Plus className="w-4 h-4 text-gray-400"/>}
          </button>
        );})}
      </div>
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Items en esta cita ({items.length})</p>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 border-2 border-primary-100 rounded-xl bg-primary-50/30">
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p></div>
              <input type="number" value={item.quantity_expected} onChange={e => updateItem(idx, 'quantity_expected', e.target.value)} placeholder="Cant." min="0" step="0.01"
                className="w-20 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 text-center"/>
              <select value={item.unit_id} onChange={e => updateItem(idx, 'unit_id', e.target.value)}
                className="w-24 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-400">
                <option value="">Unidad</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
              </select>
              <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AppointmentModal ─────────────────────────────────────────────────────────
const AppointmentModal = ({ appointment, onClose, preselectedDate, isReschedule }) => {
  const queryClient = useQueryClient();
  const isEdit = !!appointment && !isReschedule;

  const [form, setForm] = useState({
    provider_id:      appointment?.provider?.id || '',
    appointment_date: isReschedule ? '' : (appointment?.appointment_date || preselectedDate || ''),
    appointment_time: isReschedule ? '09:00' : (appointment?.appointment_time?.slice(0,5) || '09:00'),
    duration_minutes: appointment?.duration_minutes || 60,
    type:             appointment?.type || 'entrega',
    notes:            isReschedule ? '' : (appointment?.notes || ''),
    status:           isReschedule ? 'scheduled' : (appointment?.status || 'scheduled'),
    attachment:       null,
  });
  const [itemsState, setItemsState] = useState(
    (appointment?.items || []).map(item => ({
      product_service_id: item.product_service_id,
      product_name:       item.product_name,
      product_type:       item.product_type,
      quantity_expected:  item.quantity_expected || '',
      unit_id:            item.unit?.id || item.unit_id || '',
    }))
  );
  const [error,     setError]     = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: providersData } = useQuery({ queryKey: ['providers-select'], queryFn: () => providerService.getAll({ per_page: 200 }), staleTime: 5*60*1000 });
  const { data: unitsData }     = useQuery({ queryKey: ['units'], queryFn: appointmentService.getUnits, staleTime: 10*60*1000 });
  const providers = providersData?.data || providersData?.providers || [];
  const units     = unitsData?.units || [];
  const { data: eligibility, isLoading: checkingEligibility } = useProviderEligibility(!isEdit && form.provider_id ? form.provider_id : null);

  const mutation = useMutation({
    mutationFn: isEdit ? (data) => appointmentService.update(appointment.id, data) : appointmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
      showToast.success(isReschedule ? '¡Cita reagendada!' : isEdit ? 'Cita actualizada' : '¡Cita agendada!');
      onClose();
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'provider_id') { setConfirmed(false); setItemsState([]); }
  };

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.provider_id) { setError('Selecciona un proveedor'); return; }
    if (!isEdit && eligibility && !eligibility.eligible && !confirmed) { setError('Confirma que deseas agendar marcando la casilla'); return; }
    mutation.mutate({
      ...form,
      rescheduled_from_id: isReschedule ? appointment.id : undefined,
      items: itemsState.map(i => ({ product_service_id: i.product_service_id, quantity_expected: i.quantity_expected || null, unit_id: i.unit_id || null })),
    });
  };

  const isNotEligible = !isEdit && eligibility && !eligibility.eligible;
  const endTime       = calcEndTime(form.appointment_time, form.duration_minutes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl ${isReschedule ? 'bg-gradient-to-r from-orange-50 to-amber-50' : 'bg-gradient-to-r from-primary-50 to-pink-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md ${isReschedule ? 'bg-orange-500' : 'bg-gradient-primary'}`}>
              {isReschedule ? <RefreshCw className="w-5 h-5 text-white"/> : <Calendar className="w-5 h-5 text-white"/>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isReschedule ? 'Reagendar Cita' : isEdit ? 'Editar Cita' : 'Nueva Cita'}</h2>
              {isReschedule && <p className="text-xs text-orange-600">Selecciona nueva fecha y hora para {appointment?.provider?.business_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isReschedule && (
            <div className="flex items-start gap-2 p-3 border border-orange-200 rounded-xl bg-orange-50">
              <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-orange-700">Se creará una nueva cita. Selecciona la nueva fecha y hora.</p>
            </div>
          )}
          {!isReschedule && !isEdit && (
            <div className="flex items-start gap-2 p-3 border border-blue-200 rounded-xl bg-blue-50">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-blue-700">El proveedor completará vehículo y chofer desde su portal.</p>
            </div>
          )}

          {/* Proveedor */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Building2 className="inline w-4 h-4 mr-1 text-primary-600"/>Proveedor *</label>
            <select value={form.provider_id} onChange={e => set('provider_id', e.target.value)} required
              disabled={isReschedule}
              className={`w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 ${isReschedule ? 'bg-gray-50 text-gray-500' : ''}`}>
              <option value="">Selecciona un proveedor...</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.business_name} — {p.rfc}</option>)}
            </select>
            {form.provider_id && !isEdit && checkingEligibility && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><div className="w-3 h-3 border-2 border-gray-300 rounded-full border-t-primary-600 animate-spin"/>Verificando...</div>
            )}
            {!isEdit && eligibility?.eligible && (
              <div className="flex items-center gap-2 px-3 py-2 mt-2 border border-green-200 rounded-lg bg-green-50">
                <ShieldCheck className="w-4 h-4 text-green-600"/>
                <p className="text-xs font-medium text-green-700">Proveedor activo con documentación al día ✓</p>
              </div>
            )}
            {!isEdit && isNotEligible && (
              <div className="p-3 mt-2 space-y-2 border-2 border-red-200 rounded-xl bg-red-50">
                <div className="flex items-center gap-2"><ShieldX className="w-4 h-4 text-red-600"/><p className="text-xs font-semibold text-red-700">Pendientes:</p></div>
                <ul className="pl-6 space-y-1">{eligibility.issues.map((issue, idx) => <li key={idx} className="text-xs text-red-600 list-disc">{issue}</li>)}</ul>
                <label className="flex items-start gap-2 pt-2 mt-3 border-t border-red-200 cursor-pointer">
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded"/>
                  <span className="text-xs text-red-700">Entiendo los pendientes y deseo agendar de todas formas</span>
                </label>
              </div>
            )}
          </div>

          {/* Fecha + Hora estilo Google Calendar */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              <Calendar className="inline w-4 h-4 mr-1 text-primary-600"/>Fecha y horario *
              {isReschedule && <span className="ml-2 text-xs font-normal text-orange-600">← Selecciona nueva fecha</span>}
            </label>
            <div className="flex flex-wrap items-center gap-2 p-3 border-2 border-gray-200 rounded-xl bg-gray-50">
              <input type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)}
                min={new Date().toLocaleDateString('en-CA')} required
                className={`px-3 py-2 text-sm border-2 rounded-lg bg-white focus:outline-none focus:border-primary-500 ${isReschedule ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'}`}/>
              <select value={form.appointment_time}
                onChange={e => {
                  const newStart   = e.target.value;
                  const [h, m]     = newStart.split(':').map(Number);
                  const newEndMins = h * 60 + m + (form.duration_minutes || 60);
                  setForm(f => ({ ...f, appointment_time: newStart, ...(newEndMins > 19*60 ? { duration_minutes: 19*60 - (h*60+m) } : {}) }));
                }}
                required className="px-3 py-2 text-sm bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="font-semibold text-gray-400">—</span>
              <select
                value={calcEndTime(form.appointment_time, form.duration_minutes) || ''}
                onChange={e => {
                  const endVal     = e.target.value;
                  if (!endVal || !form.appointment_time) return;
                  const startClean = form.appointment_time.slice(0, 5);
                  const [sh, sm]   = startClean.split(':').map(Number);
                  const [eh, em]   = endVal.split(':').map(Number);
                  const diff = eh * 60 + em - (sh * 60 + sm);
                  if (diff > 0) set('duration_minutes', diff);
                }}
                className="px-3 py-2 text-sm bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500">
                {HOURS.filter(h => {
                  const [hh, mm]   = h.split(':').map(Number);
                  const startClean = form.appointment_time.slice(0, 5);
                  const [sh, sm]   = startClean.split(':').map(Number);
                  return hh * 60 + mm > sh * 60 + sm;
                }).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {form.duration_minutes > 0 && (
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                  {form.duration_minutes < 60 ? `${form.duration_minutes} min` : form.duration_minutes % 60 === 0 ? `${form.duration_minutes/60} h` : `${Math.floor(form.duration_minutes/60)} h ${form.duration_minutes%60} min`}
                </span>
              )}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Tag className="inline w-4 h-4 mr-1 text-primary-600"/>Tipo *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('type', opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.type === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.color}`}/>{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Productos */}
          {form.type === 'entrega' && form.provider_id && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Package className="inline w-4 h-4 mr-1 text-primary-600"/>Productos / Servicios</label>
              <ItemsSelector providerId={form.provider_id} items={itemsState} setItems={setItemsState} units={units}/>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><FileText className="inline w-4 h-4 mr-1 text-primary-600"/>Observaciones</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} maxLength={2000}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/>
          </div>

          {/* Adjunto */}
          {!isReschedule && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Paperclip className="inline w-4 h-4 mr-1 text-primary-600"/>Adjunto (opcional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => set('attachment', e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700"/>
            </div>
          )}

          {/* Estado solo en edición */}
          {isEdit && !isReschedule && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">
                <option value="scheduled">Agendada</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className={`flex-1 ${isReschedule ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>
              {isReschedule ? 'Reagendar cita' : isEdit ? 'Guardar cambios' : 'Agendar cita'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DetailModal ──────────────────────────────────────────────────────────────
const DetailModal = ({ appointment, onClose, onEdit, onReschedule }) => {
  const queryClient = useQueryClient();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason,   setCancelReason]   = useState('');

  const cancelMutation = useMutation({
    mutationFn: () => appointmentService.cancel(appointment.id, cancelReason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false }); showToast.success('Cita cancelada'); onClose(); },
    onError:   () => showToast.error('Error al cancelar'),
  });

  const cfg        = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = cfg.icon;
  const endTime    = appointment.end_time || calcEndTime(appointment.appointment_time?.slice(0,5), appointment.duration_minutes);
  const hasItems   = appointment.items?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center min-w-0 gap-3">
            <span className={`flex-shrink-0 w-3 h-3 rounded-full ${typeColor(appointment.type)}`}/>
            <h2 className="font-bold text-gray-900 truncate">{appointment.type_label}</h2>
            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
              <StatusIcon className="w-3 h-3"/>{cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 ml-2 text-gray-400 rounded-lg hover:bg-gray-200"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-4">
          {appointment.rescheduled_from && (
            <div className="flex items-center gap-2 p-3 border border-purple-200 rounded-xl bg-purple-50">
              <RefreshCw className="flex-shrink-0 w-4 h-4 text-purple-500"/>
              <p className="text-xs text-purple-700">
                Reagendada de la cita del{' '}
                {new Date(appointment.rescheduled_from.appointment_date+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}
                {' '}a las {appointment.rescheduled_from.appointment_time?.slice(0,5)} hrs
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-blue-100 rounded-xl bg-blue-50">
              <p className="mb-1 text-xs font-semibold text-blue-600">Fecha</p>
              <p className="text-sm font-bold text-blue-900 capitalize">
                {new Date(appointment.appointment_date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
              </p>
            </div>
            <div className="p-3 border border-purple-100 rounded-xl bg-purple-50">
              <p className="mb-1 text-xs font-semibold text-purple-600">Hora</p>
              <p className="text-sm font-bold text-purple-900">
                {appointment.appointment_time?.slice(0,5)} {endTime ? `— ${endTime}` : ''} hrs
              </p>
              {appointment.duration_minutes && (
                <p className="text-xs text-purple-600 mt-0.5">
                  {appointment.duration_minutes < 60 ? `${appointment.duration_minutes} min` : appointment.duration_minutes % 60 === 0 ? `${appointment.duration_minutes/60} h` : `${Math.floor(appointment.duration_minutes/60)} h ${appointment.duration_minutes%60} min`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
            <Building2 className="flex-shrink-0 w-5 h-5 text-gray-500"/>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Proveedor</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{appointment.provider?.business_name}</p>
              <p className="font-mono text-xs text-gray-400">{appointment.provider?.rfc}</p>
            </div>
          </div>

          {hasItems && (
            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
              <p className="flex items-center gap-1 mb-2 text-xs font-semibold text-gray-600"><Package className="w-3.5 h-3.5"/>Productos / Servicios</p>
              <div className="space-y-1.5">
                {appointment.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 flex items-center gap-1.5">
                      {item.product_type === 'product' ? <Package className="w-3 h-3 text-primary-400"/> : <Wrench className="w-3 h-3 text-teal-400"/>}
                      {item.product_name}
                    </span>
                    {item.quantity_expected && <span className="font-medium text-gray-500">{item.quantity_expected} {item.unit?.abbreviation}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {appointment.is_completed_by_provider ? (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 space-y-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle className="w-3.5 h-3.5"/>Proveedor completó su información</p>
              {appointment.vehicle_display && <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-green-600"/><p className="text-sm text-green-800">{appointment.vehicle_display}</p></div>}
              {appointment.driver_display  && <div className="flex items-center gap-2"><User  className="w-4 h-4 text-green-600"/><p className="text-sm text-green-800">{appointment.driver_display}</p></div>}
            </div>
          ) : appointment.status !== 'no_show' && appointment.status !== 'cancelled' && (
            <div className="flex items-center gap-2 p-3 border rounded-xl bg-amber-50 border-amber-200">
              <Clock className="w-4 h-4 text-amber-500"/>
              <p className="text-xs text-amber-700">Esperando que el proveedor complete vehículo y chofer</p>
            </div>
          )}

          {appointment.is_entry_confirmed && (
            <div className="p-3 space-y-1 border border-green-200 rounded-xl bg-green-50">
              <p className="flex items-center gap-1 text-xs font-semibold text-green-700"><ShieldCheck className="w-3.5 h-3.5"/>Entrada confirmada</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-green-600"><Timer className="w-3.5 h-3.5"/>Llegó: {appointment.actual_arrival_time?.slice(0,5)} hrs</span>
                {appointment.arrived_on_time === false && <span className="text-xs font-semibold text-orange-600">⚠️ Retraso: {appointment.delay_minutes} min</span>}
                {appointment.arrived_on_time === true  && <span className="text-xs font-semibold text-green-600">✅ A tiempo</span>}
              </div>
            </div>
          )}

          {appointment.status === 'no_show' && (
            <div className="p-4 space-y-3 border-2 border-orange-300 rounded-xl bg-orange-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600"/>
                <p className="text-sm font-bold text-orange-700">El proveedor no se presentó</p>
              </div>
              {appointment.no_show_notes && <p className="text-xs text-orange-600">{appointment.no_show_notes}</p>}
              {appointment.is_rescheduled ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-gray-500"/>
                  <p className="text-xs text-gray-600">Esta cita ya fue reagendada.</p>
                </div>
              ) : (
                <button
                  onClick={() => { onReschedule(appointment); onClose(); }}
                  className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  <RefreshCw className="w-4 h-4"/>Reagendar esta cita
                </button>
              )}
            </div>
          )}

          {appointment.notes && (
            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
              <p className="mb-1 text-xs text-gray-500">Observaciones</p>
              <p className="text-sm text-gray-800">{appointment.notes}</p>
            </div>
          )}

          {appointment.has_attachment && (
            <button onClick={() => appointmentService.downloadAttachment(appointment.id, appointment.attachment_name)}
              className="flex items-center w-full gap-2 p-3 text-left border rounded-xl bg-primary-50 border-primary-200 hover:bg-primary-100">
              <Paperclip className="w-4 h-4 text-primary-600"/>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-600">Adjunto</p>
                <p className="text-sm font-semibold truncate text-primary-800">{appointment.attachment_name}</p>
              </div>
              <Download className="w-4 h-4 text-primary-600"/>
            </button>
          )}

          {appointment.status === 'cancelled' && appointment.cancellation_reason && (
            <div className="p-3 border border-red-200 rounded-xl bg-red-50">
              <p className="mb-1 text-xs text-red-600">Motivo cancelación</p>
              <p className="text-sm text-red-800">{appointment.cancellation_reason}</p>
            </div>
          )}

          {showCancelForm && (
            <div className="p-4 space-y-3 border-2 border-red-200 rounded-xl bg-red-50">
              <p className="text-sm font-semibold text-red-800">¿Motivo de cancelación?</p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-red-300 rounded-lg resize-none focus:outline-none"/>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>Confirmar</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCancelForm(false)}>Volver</Button>
              </div>
            </div>
          )}

          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'no_show' && !showCancelForm && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => { onEdit(appointment); onClose(); }} className="flex-1">Editar</Button>
              <Button variant="danger"    size="sm" onClick={() => setShowCancelForm(true)} className="flex-1">Cancelar cita</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── BlockModal — crear/editar/eliminar un bloqueo de horario ────────────────
const BlockModal = ({ block, onClose, preselectedDate, preselectedTime }) => {
  const queryClient = useQueryClient();
  const isEdit = !!block;

  const [form, setForm] = useState({
    block_date:   block?.block_date || preselectedDate || '',
    start_time:   block?.start_time || preselectedTime || '09:00',
    end_time:     block?.end_time   || '10:00',
    title:        block?.title || '',
    observations: block?.observations || '',
  });
  const [error, setError] = useState('');

  const invalidateBlocks = () => queryClient.invalidateQueries({ queryKey: ['calendar-blocks'], exact: false });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/calendar-blocks/${block.id}`, data).then(r => r.data)
      : api.post('/calendar-blocks', data).then(r => r.data),
    onSuccess: () => {
      invalidateBlocks();
      showToast.success(isEdit ? 'Bloqueo actualizado' : 'Espacio bloqueado correctamente');
      onClose();
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/calendar-blocks/${block.id}`),
    onSuccess: () => {
      invalidateBlocks();
      showToast.success('Bloqueo eliminado');
      onClose();
    },
    onError: () => showToast.error('Error al eliminar el bloqueo'),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.block_date || !form.start_time || !form.end_time || !form.title.trim()) {
      setError('Completa fecha, horario y título'); return;
    }
    if (form.end_time <= form.start_time) {
      setError('La hora de fin debe ser después de la hora de inicio'); return;
    }
    mutation.mutate(form);
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este bloqueo de horario? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-lg shadow-md">
              <Ban className="w-5 h-5 text-white"/>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar bloqueo' : 'Bloquear espacio'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              <Calendar className="inline w-4 h-4 mr-1 text-red-500"/>Fecha *
            </label>
            <input type="date" value={form.block_date} onChange={e => set('block_date', e.target.value)} required
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Hora inicio *</label>
              <select value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Hora fin *</label>
              <select value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Título *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} maxLength={255} required
              placeholder="Ej. Mantenimiento, Junta general, Capacitación..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400"/>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Observaciones <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={2} maxLength={1000}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"/>
          </div>

          {isEdit && block.created_by && (
            <p className="text-xs text-gray-400">Creado por {block.created_by}</p>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending}
              className="flex-1 text-white bg-red-500 hover:bg-red-600">
              {isEdit ? 'Guardar cambios' : 'Bloquear espacio'}
            </Button>
            {isEdit && (
              <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={handleDelete}>
                Eliminar
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending || deleteMutation.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DaySelectorModal — al hacer clic en un día, elegir cita o bloqueo ───────
const DaySelectorModal = ({ dateStr, onSelectAppointment, onSelectBlock, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-sm bg-white shadow-2xl rounded-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
        <h2 className="text-lg font-bold text-gray-900 capitalize">
          {new Date(dateStr+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'})}
        </h2>
        <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
      </div>
      <div className="p-6 space-y-3">
        <p className="mb-1 text-xs text-gray-500">¿Qué deseas hacer en este día?</p>
        <button onClick={onSelectAppointment}
          className="flex items-center w-full gap-3 p-4 text-left transition-all border-2 rounded-xl border-primary-200 bg-primary-50 hover:bg-primary-100 hover:border-primary-300">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100">
            <Plus className="w-5 h-5 text-primary-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-primary-800">Nueva cita</p>
            <p className="text-xs text-primary-600">Agendar la visita de un proveedor</p>
          </div>
        </button>
        <button onClick={onSelectBlock}
          className="flex items-center w-full gap-3 p-4 text-left transition-all border-2 border-red-200 rounded-xl bg-red-50 hover:bg-red-100 hover:border-red-300">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-red-100 rounded-xl">
            <Ban className="w-5 h-5 text-red-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">Bloquear espacio</p>
            <p className="text-xs text-red-600">Reservar el horario para otra actividad</p>
          </div>
        </button>
      </div>
    </div>
  </div>
);

// ─── Página principal ─────────────────────────────────────────────────────────
export const AppointmentsPage = () => {
  const currentUser = useAuthStore(s => s.user);
  const userRoles   = currentUser?.roles || [];
  const canManageBlocks = userRoles.some(r => ['super_admin','admin','compras'].includes(r));

  const [view,              setView]              = useState('month');
  const [currentDate,       setCurrentDate]       = useState(new Date());
  const [showModal,         setShowModal]         = useState(false);
  const [editAppointment,   setEditAppointment]   = useState(null);
  const [rescheduleAppt,    setRescheduleAppt]    = useState(null);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [preselectedDate,   setPreselectedDate]   = useState('');

  // ✅ Nuevo: estado de bloqueos y selector de día
  const [showBlockModal,      setShowBlockModal]      = useState(false);
  const [editBlock,            setEditBlock]           = useState(null);
  const [blockPreselectedDate, setBlockPreselectedDate] = useState('');
  const [blockPreselectedTime, setBlockPreselectedTime] = useState('');
  const [daySelectorDate,      setDaySelectorDate]      = useState(null);

  const getWeekStart = (date) => { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', year, month + 1],
    queryFn: () => appointmentService.getAll({ year, month: month + 1 }),
    keepPreviousData: true,
  });

  const { data: blocksData } = useQuery({
    queryKey: ['calendar-blocks', year, month + 1],
    queryFn:  () => api.get('/calendar-blocks', { params: { year, month: month + 1 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const appointments = data?.appointments || [];
  const blocks       = blocksData?.blocks || [];

  const byDate = useMemo(() => {
    const map = {};
    appointments.forEach(a => { if (!map[a.appointment_date]) map[a.appointment_date] = []; map[a.appointment_date].push(a); });
    return map;
  }, [appointments]);

  const blocksByDate = useMemo(() => {
    const map = {};
    blocks.forEach(b => { if (!map[b.block_date]) map[b.block_date] = []; map[b.block_date].push(b); });
    return map;
  }, [blocks]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);

  const navigateCal = (dir) => {
    if (view === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else { const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7); setWeekStart(d); }
  };

  const todayStr   = new Date().toLocaleDateString('en-CA');
  const fmt        = (d) => d.toLocaleDateString('en-CA');
  const openCreate = (dateStr = '') => { setPreselectedDate(dateStr); setEditAppointment(null); setRescheduleAppt(null); setShowModal(true); };

  // ✅ Abre el bloqueo en modo creación con fecha (y hora opcional) precargada
  const openCreateBlock = (dateStr = '', time = '') => {
    setEditBlock(null);
    setBlockPreselectedDate(dateStr);
    setBlockPreselectedTime(time);
    setShowBlockModal(true);
  };

  // ✅ Abre el bloqueo en modo edición
  const openEditBlock = (block) => {
    setEditBlock(block);
    setBlockPreselectedDate('');
    setBlockPreselectedTime('');
    setShowBlockModal(true);
  };

  // ✅ Clic en una celda del calendario (día o hueco de hora):
  //    si el usuario puede gestionar bloqueos, pregunta qué quiere hacer;
  //    si no, va directo a crear cita (comportamiento original).
  const handleCellClick = (dateStr, time = '') => {
    if (canManageBlocks) {
      setDaySelectorDate({ dateStr, time });
    } else {
      openCreate(dateStr);
    }
  };

  const stats = useMemo(() => ({
    total:        appointments.length,
    scheduled:    appointments.filter(a => a.status === 'scheduled').length,
    confirmed:    appointments.filter(a => a.status === 'confirmed').length,
    missing_docs: appointments.filter(a => a.has_missing_docs).length,
    no_show:      appointments.filter(a => a.status === 'no_show').length,
  }), [appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><Calendar className="w-6 h-6 text-white"/></div>
          <div><h1 className="text-3xl font-bold text-gray-900">Calendario de Citas</h1><p className="text-sm text-gray-600">Agenda y gestiona las visitas de proveedores</p></div>
        </div>
        <div className="flex items-center gap-2">
          {canManageBlocks && (
            <Button variant="secondary" leftIcon={<Ban className="w-4 h-4"/>}
              onClick={() => openCreateBlock()}>
              Bloquear espacio
            </Button>
          )}
          <Button onClick={() => openCreate()} leftIcon={<Plus className="w-4 h-4"/>}>Nueva Cita</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Este mes',       value: stats.total,        color: 'blue'   },
          { label: 'Agendadas',      value: stats.scheduled,    color: 'purple' },
          { label: 'Confirmadas',    value: stats.confirmed,    color: 'green'  },
          { label: 'No presentaron', value: stats.no_show,      color: 'orange' },
          { label: 'Docs faltantes', value: stats.missing_docs, color: 'red'    },
        ].map(s => (
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateCal(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[200px] text-center">
            {view === 'month' ? `${MONTHS[month]} ${year}` : `${weekDays[0].toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — ${weekDays[6].toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`}
          </h2>
          <button onClick={() => navigateCal(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
          <button onClick={() => { setCurrentDate(new Date()); setWeekStart(getWeekStart(new Date())); }}
            className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100">Hoy</button>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['month','Mes',LayoutGrid],['week','Semana',List]].map(([val,label,Icon]) => (
            <button key={val} onClick={() => setView(val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${val === view ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
          {isLoading ? (
            <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 rounded-full border-t-primary-600 animate-spin"/></div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-28 bg-gray-50"/>;
                const dateStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayAppts  = byDate[dateStr] || [];
                const dayBlocks = blocksByDate[dateStr] || [];
                const isToday   = dateStr === todayStr;
                const isPast    = dateStr < todayStr;
                const total     = dayAppts.length + dayBlocks.length;
                const shownBlocks = dayBlocks.slice(0, 1);
                const shownAppts  = dayAppts.slice(0, 3 - shownBlocks.length);
                const extra       = total - shownBlocks.length - shownAppts.length;

                return (
                  <div key={dateStr}
                    className={`h-28 p-1.5 border-b border-r border-gray-100 cursor-pointer group transition-colors ${isToday ? 'bg-primary-50' : isPast ? 'bg-gray-50/50' : 'bg-white hover:bg-blue-50/40'}`}
                    onClick={() => !isPast && handleCellClick(dateStr)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday ? 'bg-primary-600 text-white' : isPast ? 'text-gray-400' : 'text-gray-700 group-hover:bg-primary-100 group-hover:text-primary-700'}`}>{day}</span>
                      {total > 0 && <span className="text-xs font-bold text-gray-400">{total}</span>}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {/* ✅ Bloques primero — clic abre edición (si tiene permiso) */}
                      {shownBlocks.map(b => (
                        <div key={`b-${b.id}`}
                          onClick={e => { e.stopPropagation(); if (canManageBlocks) openEditBlock(b); }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white bg-red-400 truncate ${canManageBlocks ? 'cursor-pointer hover:bg-red-500' : ''}`}>
                          <Ban className="w-2.5 h-2.5 flex-shrink-0"/>
                          <span className="truncate">{b.start_time} {b.title}</span>
                        </div>
                      ))}
                      {/* Citas */}
                      {shownAppts.map(a => (
                        <div key={a.id} onClick={e => { e.stopPropagation(); setDetailAppointment(a); }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate cursor-pointer hover:opacity-80 ${typeColor(a.type)} ${a.status==='cancelled'?'opacity-40 line-through':''} ${a.status==='no_show'?'opacity-60':''}`}>
                          <span>{a.appointment_time?.slice(0,5)}</span>
                          <span className="truncate">{a.provider?.business_name}</span>
                          {a.has_missing_docs && <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0"/>}
                          {a.status==='no_show' && <span className="w-1.5 h-1.5 rounded-full bg-orange-300 flex-shrink-0"/>}
                        </div>
                      ))}
                      {extra > 0 && <p className="text-xs text-center text-gray-400">+{extra} más</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vista semana */}
      {view === 'week' && (
        <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="py-3 border-r border-gray-200"/>
            {weekDays.map((d, i) => {
              const dateStr = fmt(d);
              const isToday = dateStr === todayStr;
              return (
                <div key={i} className={`py-3 text-center border-r border-gray-100 ${isToday ? 'bg-primary-50' : ''}`}>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{DAYS[d.getDay()]}</p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>{d.getDate()}</p>
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
                {weekDays.map((d, i) => {
                  const dateStr    = fmt(d);
                  const isToday    = dateStr === todayStr;
                  const hourAppts  = (byDate[dateStr]      || []).filter(a => a.appointment_time?.slice(0,5) === hour);
                  const hourBlocks = (blocksByDate[dateStr] || []).filter(b => b.start_time === hour);
                  const totalItems = hourBlocks.length + hourAppts.length;

                  return (
                    <div key={i} onClick={() => handleCellClick(dateStr, hour)}
                      className={`relative p-0.5 border-r border-gray-100 cursor-pointer hover:bg-blue-50/40 ${isToday ? 'bg-primary-50/30' : ''}`}>

                      {/* ✅ Bloques — clic abre edición (si tiene permiso) */}
                      {hourBlocks.map((b, bi) => {
                        const [sh,sm] = b.start_time.split(':').map(Number);
                        const [eh,em] = b.end_time.split(':').map(Number);
                        const slots   = Math.max(1, Math.round(((eh*60+em)-(sh*60+sm)) / 30));
                        const height  = slots * 56 - 4;
                        const width   = totalItems > 1 ? `${100/totalItems}%` : '95%';
                        const left    = `${(bi/totalItems)*100}%`;
                        return (
                          <div key={`b-${b.id}`} style={{ height:`${height}px`, width, left, zIndex:10 }}
                            className={`absolute top-0.5 px-1 py-0.5 rounded-lg text-xs font-medium text-white bg-red-400 overflow-hidden ${canManageBlocks ? 'cursor-pointer hover:bg-red-500' : 'cursor-default'}`}
                            onClick={e => { e.stopPropagation(); if (canManageBlocks) openEditBlock(b); }}>
                            <div className="flex items-center gap-0.5"><Ban className="w-2.5 h-2.5 flex-shrink-0"/><span className="font-bold truncate">{b.title}</span></div>
                            {slots >= 2 && <p className="text-white/80 text-[10px]">{b.start_time}–{b.end_time}</p>}
                          </div>
                        );
                      })}

                      {/* ✅ Citas lado a lado si coinciden */}
                      {hourAppts.map((a, ai) => {
                        const slots  = Math.max(1, Math.round((a.duration_minutes||60) / 30));
                        const height = slots * 56 - 4;
                        const colIdx = hourBlocks.length + ai;
                        const width  = totalItems > 1 ? `${100/totalItems}%` : '95%';
                        const left   = `${(colIdx/totalItems)*100}%`;
                        const endT   = a.end_time || calcEndTime(a.appointment_time?.slice(0,5), a.duration_minutes);
                        return (
                          <div key={a.id} onClick={e => { e.stopPropagation(); setDetailAppointment(a); }}
                            style={{ height:`${height}px`, width, left, zIndex:10 }}
                            className={`absolute top-0.5 px-1.5 py-1 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-80 overflow-hidden ${typeColor(a.type)} ${a.status==='cancelled'?'opacity-40':''} ${a.status==='no_show'?'opacity-70 border-2 border-orange-300':''}`}>
                            <p className="font-bold leading-tight">{a.appointment_time?.slice(0,5)}{endT ? ` — ${endT}` : ''}</p>
                            <p className="leading-tight truncate">{a.provider?.business_name}</p>
                            {a.status === 'no_show' && <p className="text-orange-200 text-[10px]">● No llegó</p>}
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
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
        {TYPE_OPTIONS.map(t => <span key={t.value} className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className={`w-3 h-3 rounded-full ${t.color}`}/>{t.label}</span>)}
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 ml-4"><Ban className="w-3 h-3"/>Espacio bloqueado</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-orange-500"><span className="w-2 h-2 bg-orange-400 rounded-full"/>No se presentó</span>
      </div>

      {/* Modales */}
      {showModal && (
        <AppointmentModal
          appointment={editAppointment || rescheduleAppt}
          preselectedDate={preselectedDate}
          isReschedule={!!rescheduleAppt}
          onClose={() => { setShowModal(false); setEditAppointment(null); setRescheduleAppt(null); }}
        />
      )}
      {detailAppointment && (
        <DetailModal
          appointment={detailAppointment}
          onClose={() => setDetailAppointment(null)}
          onEdit={(a) => { setEditAppointment(a); setRescheduleAppt(null); setShowModal(true); setDetailAppointment(null); }}
          onReschedule={(a) => { setRescheduleAppt(a); setEditAppointment(null); setShowModal(true); }}
        />
      )}

      {/* ✅ Selector: ¿nueva cita o bloqueo? */}
      {daySelectorDate && (
        <DaySelectorModal
          dateStr={daySelectorDate.dateStr}
          onSelectAppointment={() => { const { dateStr } = daySelectorDate; setDaySelectorDate(null); openCreate(dateStr); }}
          onSelectBlock={() => { const { dateStr, time } = daySelectorDate; setDaySelectorDate(null); openCreateBlock(dateStr, time); }}
          onClose={() => setDaySelectorDate(null)}
        />
      )}

      {/* ✅ Modal de bloqueo (crear/editar) */}
      {showBlockModal && (
        <BlockModal
          block={editBlock}
          preselectedDate={blockPreselectedDate}
          preselectedTime={blockPreselectedTime}
          onClose={() => { setShowBlockModal(false); setEditBlock(null); setBlockPreselectedDate(''); setBlockPreselectedTime(''); }}
        />
      )}
    </div>
  );
};
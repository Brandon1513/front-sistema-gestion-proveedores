import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  Shield, Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Truck, User, X, AlertCircle,
  FileText, LayoutGrid, List as ListIcon, Info, Timer,
  UserX, Package, Wrench, ChevronDown, ChevronUp,
  History, Search, Filter, FlaskConical,
} from 'lucide-react';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TYPE_CONFIG = {
  entrega:     { label:'Entrega de mercancía',    dot:'bg-blue-500',   bg:'bg-blue-50',   border:'border-blue-200'   },
  residuos:    { label:'Recolección de residuos', dot:'bg-green-500',  bg:'bg-green-50',  border:'border-green-200'  },
  auditoria:   { label:'Auditoría / Calidad',     dot:'bg-purple-500', bg:'bg-purple-50', border:'border-purple-200' },
  calibracion: { label:'Calibración de equipos',  dot:'bg-amber-500',  bg:'bg-amber-50',  border:'border-amber-200'  },
  servicio:    { label:'Servicio general',        dot:'bg-gray-500',   bg:'bg-gray-50',   border:'border-gray-200'   },
};

const STATUS_COLOR = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-green-500',
  completed: 'bg-gray-400',
  no_show:   'bg-orange-500',
  cancelled: 'bg-red-400',
};

const fmt      = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
const fmtShort = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'});

// ─── Helpers de color ─────────────────────────────────────────────────────────
const getReceptionColor = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-400';
  if (a.reception_status === 'rejected')                             return 'bg-red-500';
  if (a.reception_status === 'partial')                              return 'bg-amber-500';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-500';
  if (a.status === 'confirmed')                                      return 'bg-green-500';
  return 'bg-blue-500';
};
const getReceptionHourBlock = (a) => {
  if (a.status === 'no_show')                                        return 'bg-orange-100 text-orange-700';
  if (a.reception_status === 'rejected')                             return 'bg-red-100 text-red-700';
  if (a.reception_status === 'partial')                              return 'bg-amber-100 text-amber-700';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-800';
};
const getReceptionCardBorder = (a) => {
  if (a.status === 'no_show')                                        return 'border-orange-200 bg-orange-50/20';
  if (a.reception_status === 'rejected')                             return 'border-red-200 bg-red-50/20';
  if (a.reception_status === 'partial')                              return 'border-amber-200 bg-amber-50/20';
  if (a.reception_status === 'accepted' || a.status === 'completed') return 'border-teal-200 bg-teal-50/20';
  return 'border-gray-200 bg-white';
};
const getAccessHourBlock = (a) => {
  if (a.status === 'no_show') return 'bg-orange-100 text-orange-700';
  if (a.is_entry_confirmed)   return a.has_missing_docs ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-800';
};

// ─── Modal: Detalle No se presentó ───────────────────────────────────────────
const NoShowDetailModal = ({ appointment, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500 shadow-md">
            <UserX className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">No se presentó</h2>
            <p className="text-xs text-gray-500">{appointment.provider?.business_name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 space-y-2">
          <p className="text-sm font-semibold text-orange-800">
            {appointment.provider?.business_name} no llegó a su cita de las {appointment.appointment_time?.slice(0,5)} hrs.
          </p>
          {appointment.no_show_at && (
            <p className="text-xs text-orange-600">Registrado a las {appointment.no_show_at}</p>
          )}
        </div>
        {appointment.no_show_notes ? (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-1">Observaciones registradas:</p>
            <p className="text-sm text-gray-700 italic">"{appointment.no_show_notes}"</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center">Sin observaciones adicionales</p>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Modal: Acción pendiente (Confirmar o No llegó) ───────────────────────────
const PendingActionModal = ({ appointment, onConfirm, onNoShow, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 shadow-md">
            <Shield className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">¿Qué deseas registrar?</h2>
            <p className="text-xs text-gray-500">{appointment.provider?.business_name} · {appointment.appointment_time?.slice(0,5)} hrs</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-sm text-gray-600 mb-2">Esta cita está pendiente de registro. ¿El proveedor llegó o no se presentó?</p>
        <button onClick={onConfirm}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all text-left">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Confirmar entrada</p>
            <p className="text-xs text-green-600">Registrar hora de llegada y documentos</p>
          </div>
        </button>
        <button onClick={onNoShow}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 transition-all text-left">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 flex-shrink-0">
            <UserX className="w-5 h-5 text-orange-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">No se presentó</p>
            <p className="text-xs text-orange-600">El proveedor no llegó a la cita</p>
          </div>
        </button>
        <div className="pt-2 flex justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Modal selector de citas del día ─────────────────────────────────────────
const DayAppointmentsModal = ({ dateStr, appointments, mode, onSelect, onClose }) => {
  const dateDisplay = new Date(dateStr+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
  const isAccess = mode === 'access';

  const getStatusBadge = (a) => {
    if (isAccess) {
      if (a.status === 'no_show')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>;
      if (a.is_entry_confirmed)
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3"/>Entrada confirmada</span>;
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pendiente confirmar</span>;
    } else {
      if (a.status === 'no_show')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>;
      if (!a.is_entry_confirmed)
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Shield className="w-3 h-3"/>Espera Seguridad</span>;
      if (a.is_reception_reviewed) {
        if (a.reception_status === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rechazado</span>;
        if (a.reception_status === 'partial')  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3"/>Parcial</span>;
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><CheckCircle className="w-3 h-3"/>Aceptado</span>;
      }
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Pendiente recepción</span>;
    }
  };

  const getHourBlock = (a) => isAccess ? getAccessHourBlock(a) : getReceptionHourBlock(a);
  const headerColor  = isAccess ? 'from-amber-50 to-orange-50' : 'from-teal-50 to-green-50';
  const iconBg       = isAccess ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-teal-500 to-green-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${headerColor} rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg} shadow-md`}>
              {isAccess ? <Shield className="w-5 h-5 text-white"/> : <FlaskConical className="w-5 h-5 text-white"/>}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isAccess ? 'Visitas del día' : 'Entregas del día'}</h2>
              <p className="text-xs text-gray-500 capitalize">{dateDisplay}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3">Selecciona la {isAccess ? 'visita' : 'entrega'} que deseas ver:</p>
          {appointments.map(a => (
            <button key={a.id} type="button" onClick={() => onSelect(a)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all text-left group">
              <div className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl font-bold text-base ${getHourBlock(a)}`}>
                {a.appointment_time?.slice(0,5)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{a.provider?.business_name}</p>
                {a.items?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {a.items.slice(0,2).map(item => (
                      <span key={item.id} className="text-xs text-gray-500 flex items-center gap-0.5">
                        {item.product_type==='product'?<Package className="w-2.5 h-2.5"/>:<Wrench className="w-2.5 h-2.5"/>}
                        {item.product_name}
                      </span>
                    ))}
                    {a.items.length > 2 && <span className="text-xs text-gray-400">+{a.items.length-2}</span>}
                  </div>
                )}
                <div className="mt-1">{getStatusBadge(a)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0"/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Modal No se presentó ─────────────────────────────────────────────────────
const NoShowModal = ({ appointment, onClose }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const mutation = useMutation({
    mutationFn: () => appointmentService.markNoShow(appointment.id, notes),
    onSuccess: () => { queryClient.invalidateQueries(['security-appointments']); showToast.success('Registrado como no presentado'); onClose(); },
    onError: () => showToast.error('Error al registrar'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500 shadow-md"><UserX className="w-5 h-5 text-white"/></div>
            <div><h2 className="text-lg font-bold text-gray-900">No se presentó</h2><p className="text-xs text-gray-500">{appointment.provider?.business_name}</p></div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-sm text-orange-800">Esto registrará que <strong>{appointment.provider?.business_name}</strong> no llegó a su cita de las <strong>{appointment.appointment_time} hrs</strong>.</p>
            <p className="text-xs text-orange-600 mt-1">La cita quedará con estado "No se presentó". Compras podrá gestionarla después.</p>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Observaciones <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Ej. Se esperó 30 minutos..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 resize-none"/>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} leftIcon={<UserX className="w-4 h-4"/>}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl">
              Confirmar no presentado
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal confirmar entrada ──────────────────────────────────────────────────
const ConfirmEntryModal = ({ appointment, onClose }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes]               = useState('');
  const [arrivalTime, setArrivalTime]   = useState(() => new Date().toTimeString().slice(0,5));
  const [physicalDocs, setPhysicalDocs] = useState({});
  const { data: docsConfig } = useQuery({
    queryKey: ['physical-docs-config', appointment.id],
    queryFn: () => appointmentService.getPhysicalDocsConfig(appointment.id),
    staleTime: 60 * 1000,
  });
  const requiresDocs = docsConfig?.requires_docs && appointment.type === 'entrega';
  React.useEffect(() => {
    if (docsConfig?.docs?.length) {
      const initial = {};
      docsConfig.docs.forEach(d => { initial[d.key] = true; });
      setPhysicalDocs(initial);
    }
  }, [docsConfig]);
  const [scheduledH, scheduledM] = (appointment.appointment_time || '00:00').split(':').map(Number);
  const [actualH, actualM]       = arrivalTime.split(':').map(Number);
  const delayMins = Math.max(0, (actualH*60+actualM) - (scheduledH*60+scheduledM));
  const onTime    = delayMins === 0;
  const toggleDoc = (key) => setPhysicalDocs(prev => ({ ...prev, [key]: !prev[key] }));
  const missingRequired = requiresDocs ? (docsConfig?.docs||[]).filter(d => d.required && !physicalDocs[d.key]) : [];
  const mutation = useMutation({
    mutationFn: () => appointmentService.confirmEntry(appointment.id, {
      actual_arrival_time: arrivalTime, entry_notes: notes||null, physical_docs: requiresDocs ? physicalDocs : undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries(['security-appointments']); showToast.success('Entrada confirmada correctamente'); onClose(); },
    onError: () => showToast.error('Error al confirmar entrada'),
  });
  const typeCfg = TYPE_CONFIG[appointment.type] || TYPE_CONFIG.servicio;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 shadow-md"><Shield className="w-5 h-5 text-white"/></div>
            <div><h2 className="text-lg font-bold text-gray-900">Confirmar entrada</h2><p className="text-xs text-gray-500">{appointment.provider?.business_name}</p></div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className={`p-3 rounded-xl border-2 ${typeCfg.border} ${typeCfg.bg} space-y-1.5`}>
            <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${typeCfg.dot}`}/><p className="font-bold text-gray-900 text-sm">{appointment.provider?.business_name}</p></div>
            <p className="text-xs text-gray-500">{typeCfg.label} · Cita a las {appointment.appointment_time} hrs</p>
            {appointment.vehicle_display && <p className="text-xs text-gray-600 flex items-center gap-1"><Truck className="w-3 h-3"/>{appointment.vehicle_display}</p>}
            {appointment.driver_display  && <p className="text-xs text-gray-600 flex items-center gap-1"><User className="w-3 h-3"/>{appointment.driver_display}</p>}
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Timer className="inline w-4 h-4 mr-1 text-amber-600"/>Hora real de llegada *</label>
            <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"/>
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${onTime?'bg-green-50 border border-green-200 text-green-700':'bg-red-50 border border-red-200 text-red-700'}`}>
              {onTime?<><CheckCircle className="w-4 h-4"/>Llegó a tiempo</>:<><XCircle className="w-4 h-4"/>Retraso de {delayMins} minuto{delayMins!==1?'s':''}</>}
            </div>
          </div>
          {requiresDocs && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700"><FileText className="inline w-4 h-4 mr-1 text-amber-600"/>Documentos presentados <span className="ml-1 text-xs font-normal text-gray-400">({docsConfig.provider_type})</span></label>
              <div className="space-y-2">
                {(docsConfig?.docs||[]).map(doc => (
                  <label key={doc.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${physicalDocs[doc.key]?'border-green-300 bg-green-50':doc.required?'border-red-300 bg-red-50':'border-gray-200 bg-gray-50'}`}>
                    <input type="checkbox" checked={!!physicalDocs[doc.key]} onChange={() => toggleDoc(doc.key)} className="w-4 h-4 rounded text-green-600"/>
                    <div className="flex-1"><p className={`text-sm font-medium ${physicalDocs[doc.key]?'text-green-800':'text-gray-700'}`}>{doc.label}</p>{!doc.required&&<p className="text-xs text-gray-400">Opcional</p>}</div>
                    {physicalDocs[doc.key]?<CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>:doc.required?<XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>:null}
                  </label>
                ))}
              </div>
              {missingRequired.length > 0 && (
                <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                  <div><p className="text-xs font-semibold text-red-700">Faltantes ({missingRequired.length}):</p><p className="text-xs text-red-600">{missingRequired.map(d=>d.label).join(', ')}</p></div>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Notas <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Ej. Vehículo verificado..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none"/>
          </div>
          <div className="flex gap-3">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()} leftIcon={<CheckCircle className="w-4 h-4"/>}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-xl">
              Confirmar entrada
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tarjeta de cita (Control de Acceso) ─────────────────────────────────────
const AppointmentCard = ({ appointment, onConfirm, onNoShow }) => {
  const typeCfg     = TYPE_CONFIG[appointment.type] || TYPE_CONFIG.servicio;
  const isConfirmed = appointment.is_entry_confirmed;
  const isNoShow    = appointment.status === 'no_show';
  const hasMissing  = appointment.has_missing_docs;
  const missingDocs = (appointment.physical_docs_status || []).filter(d => d.missing && d.required);
  const canAct      = !isConfirmed && !isNoShow && appointment.status !== 'cancelled';
  return (
    <div className={`rounded-xl border-2 transition-all ${isNoShow?'border-orange-200 bg-orange-50/20':isConfirmed?hasMissing?'border-red-200 bg-red-50/20':'border-green-200 bg-green-50/30':`${typeCfg.border} bg-white hover:shadow-md`}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl font-bold text-lg ${getAccessHourBlock(appointment)}`}>
            {appointment.appointment_time?.slice(0,5)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${typeCfg.dot}`}/>
              <p className="font-bold text-gray-900 truncate">{appointment.provider?.business_name}</p>
              {isNoShow && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>}
              {isConfirmed && !isNoShow && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${hasMissing?'bg-red-100 text-red-700 border-red-200':'bg-green-100 text-green-700 border-green-200'}`}>{hasMissing?<AlertCircle className="w-3 h-3"/>:<CheckCircle className="w-3 h-3"/>}Entró {appointment.entry_confirmed_at}</span>}
              {isConfirmed && appointment.arrived_on_time !== null && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${appointment.arrived_on_time?'bg-blue-100 text-blue-700 border-blue-200':'bg-orange-100 text-orange-700 border-orange-200'}`}><Timer className="w-3 h-3"/>{appointment.arrived_on_time?'A tiempo':`+${appointment.delay_minutes} min`}</span>}
            </div>
            <p className="text-sm text-gray-500">{typeCfg.label}</p>
            {appointment.is_completed_by_provider ? (
              <div className="flex flex-wrap gap-3 mt-1">
                {appointment.vehicle_display && <span className="flex items-center gap-1 text-xs text-gray-600"><Truck className="w-3 h-3 text-gray-400"/>{appointment.vehicle_display}</span>}
                {appointment.driver_display  && <span className="flex items-center gap-1 text-xs text-gray-600"><User className="w-3 h-3 text-gray-400"/>{appointment.driver_display}</span>}
              </div>
            ) : !isNoShow && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Proveedor aún no completó vehículo/chofer</p>}
            {isNoShow && appointment.no_show_notes && <p className="text-xs text-orange-600 mt-1 italic">"{appointment.no_show_notes}"</p>}
            {isConfirmed && hasMissing && missingDocs.length > 0 && <div className="mt-1.5 flex items-start gap-1"><AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5"/><p className="text-xs text-red-600">Falta: {missingDocs.map(d=>d.label).join(', ')}</p></div>}
          </div>
        </div>
        <div className="flex-shrink-0 ml-4 flex flex-col gap-2">
          {canAct && (
            <>
              <Button size="sm" onClick={() => onConfirm(appointment)} leftIcon={<Shield className="w-3.5 h-3.5"/>}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold whitespace-nowrap">Confirmar</Button>
              <button onClick={() => onNoShow(appointment)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                <UserX className="w-3.5 h-3.5"/>No llegó
              </button>
            </>
          )}
          {isConfirmed && !isNoShow && (
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${hasMissing?'bg-red-100':'bg-green-100'}`}>
              {hasMissing?<AlertCircle className="w-6 h-6 text-red-600"/>:<CheckCircle className="w-6 h-6 text-green-600"/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tarjeta de recepción (solo lectura) ──────────────────────────────────────
const ReceptionCard = ({ appointment }) => {
  const [expanded, setExpanded] = useState(false);
  const isReviewed = appointment.is_reception_reviewed;
  const isNoShow   = appointment.status === 'no_show';
  const status     = appointment.reception_status;
  const hasItems   = appointment.items?.length > 0;
  return (
    <div className={`rounded-xl border-2 transition-all ${getReceptionCardBorder(appointment)}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl font-bold text-lg ${getReceptionHourBlock(appointment)}`}>
            {appointment.appointment_time?.slice(0,5)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-bold text-gray-900 truncate">{appointment.provider?.business_name}</p>
              {isNoShow && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><UserX className="w-3 h-3"/>No se presentó</span>}
              {!isNoShow && !appointment.is_entry_confirmed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Shield className="w-3 h-3"/>Pendiente entrada</span>}
              {!isNoShow && status === 'accepted' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><CheckCircle className="w-3 h-3"/>Aceptado</span>}
              {!isNoShow && status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rechazado</span>}
              {!isNoShow && status === 'partial'  && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3"/>Parcial</span>}
              {!isNoShow && appointment.is_entry_confirmed && !isReviewed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>Pendiente recepción</span>}
            </div>
            {hasItems && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {appointment.items.slice(0,3).map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-gray-100 text-gray-600">
                    {item.product_type==='product'?<Package className="w-2.5 h-2.5"/>:<Wrench className="w-2.5 h-2.5"/>}
                    {item.product_name}
                    {item.quantity_expected && <span className="text-gray-400">· {item.quantity_expected} {item.unit?.abbreviation}</span>}
                  </span>
                ))}
                {appointment.items.length > 3 && <span className="text-xs text-gray-400">+{appointment.items.length-3} más</span>}
              </div>
            )}
            {isReviewed && <p className="text-xs text-gray-400 mt-1">Revisado por {appointment.reception_reviewed_by} · {appointment.reception_reviewed_at}</p>}
            {isNoShow && appointment.no_show_notes && <p className="text-xs text-orange-600 mt-1 italic">"{appointment.no_show_notes}"</p>}
          </div>
        </div>
        {isReviewed && (
          <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 ml-4 p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            {expanded?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}
          </button>
        )}
      </div>
      {expanded && isReviewed && hasItems && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detalle por producto</p>
          {appointment.items.map(item => {
            const rec  = parseFloat(item.quantity_received) || 0;
            const rej  = parseFloat(item.quantity_rejected)  || 0;
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
                  <div className="text-center"><p className="text-xs text-green-500">Aceptado</p><p className="text-xs font-bold text-green-800">{acc.toFixed(2)} {abbr}</p></div>
                  <div className="text-center"><p className="text-xs text-red-500">Devuelto</p><p className="text-xs font-bold text-red-800">{rej.toFixed(2)} {abbr}</p></div>
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
export const SecurityCalendarPage = () => {
  const [activeTab, setActiveTab] = useState('access');
  const [view,         setView]         = useState('month');
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  const [confirmingAppt,    setConfirmingAppt]    = useState(null);
  const [noShowAppt,        setNoShowAppt]        = useState(null);
  const [pendingActionAppt, setPendingActionAppt] = useState(null);
  const [noShowDetailAppt,  setNoShowDetailAppt]  = useState(null);
  const [accessDayModal,    setAccessDayModal]    = useState(null);
  const [recDayModal,       setRecDayModal]       = useState(null);

  const [showHistory,    setShowHistory]    = useState(false);
  const [filterProvider, setFilterProvider] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getWeekStart = (dateStr) => { const d = new Date(dateStr); d.setDate(d.getDate()-d.getDay()); return d.toLocaleDateString('en-CA'); };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d.toLocaleDateString('en-CA'); });

  // Queries Control de Acceso
  const { data: monthData } = useQuery({
    queryKey: ['security-appointments', 'month', year, month+1],
    queryFn: () => appointmentService.securityGetAppointments({ year, month: month+1 }),
    enabled: activeTab === 'access' && view === 'month',
    staleTime: 60 * 1000,
  });
  const accessParams = view==='day' ? { date: selectedDate } : view==='week' ? { view:'week', week_start:weekStart } : {};
  const { data: accessData, isLoading: accessLoading, refetch: refetchAccess } = useQuery({
    queryKey: ['security-appointments', view, view==='day' ? selectedDate : weekStart],
    queryFn: () => appointmentService.securityGetAppointments(accessParams),
    enabled: activeTab === 'access' && view !== 'month',
    refetchInterval: 60 * 1000,
  });

  // Queries Recepciones
  const { data: recMonthData } = useQuery({
    queryKey: ['security-receptions', 'month', year, month+1],
    queryFn: () => appointmentService.foodEngineerGetAppointments({ year, month: month+1 }),
    enabled: activeTab === 'receptions' && view === 'month',
    staleTime: 60 * 1000,
  });
  const recParams = view==='day' ? { date: selectedDate } : view==='week' ? { view:'week', week_start:weekStart } : {};
  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ['security-receptions', view, view==='day' ? selectedDate : weekStart],
    queryFn: () => appointmentService.foodEngineerGetAppointments(recParams),
    enabled: activeTab === 'receptions' && view !== 'month',
    refetchInterval: 60 * 1000,
  });
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['security-receptions-history', appliedFilters],
    queryFn: () => appointmentService.foodEngineerGetAppointments(appliedFilters),
    enabled: activeTab === 'receptions' && showHistory,
  });

  const accessAppointments      = accessData?.appointments || [];
  const accessMonthAppointments = monthData?.appointments  || [];
  const recAppointments         = recData?.today           || [];
  const recMonthAppointments    = recMonthData?.month_deliveries || [];
  const history                 = historyData?.history     || [];
  const providers               = historyData?.providers   || [];
  const recStats                = recData?.stats           || {};
  const isAccess                = activeTab === 'access';

  const accessByDate = useMemo(() => {
    const map = {};
    const src = view === 'month' ? accessMonthAppointments : accessAppointments;
    src.forEach(a => { if (!map[a.appointment_date]) map[a.appointment_date]=[]; map[a.appointment_date].push(a); });
    return map;
  }, [accessAppointments, accessMonthAppointments, view]);

  const recByDate = useMemo(() => {
    const map = {};
    const src = view === 'month' ? recMonthAppointments : recAppointments;
    src.forEach(a => { if (!map[a.appointment_date]) map[a.appointment_date]=[]; map[a.appointment_date].push(a); });
    return map;
  }, [recAppointments, recMonthAppointments, view]);

  const byDate    = isAccess ? accessByDate : recByDate;
  const isLoading = isAccess ? accessLoading : recLoading;

  const confirmed = accessAppointments.filter(a => a.is_entry_confirmed).length;
  const pending   = accessAppointments.filter(a => !a.is_entry_confirmed && a.status !== 'no_show' && a.status !== 'cancelled').length;
  const noShows   = accessAppointments.filter(a => a.status === 'no_show').length;

  const navigateCal = (dir) => {
    if (view === 'month')    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+dir, 1));
    else if (view === 'day') { const d = new Date(selectedDate); d.setDate(d.getDate()+dir); setSelectedDate(d.toLocaleDateString('en-CA')); }
    else                     { const d = new Date(weekStart); d.setDate(d.getDate()+dir*7); setWeekStart(d.toLocaleDateString('en-CA')); }
  };

  const todayStr    = new Date().toLocaleDateString('en-CA');
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const calCells    = Array.from({length: firstDay+daysInMonth}, (_,i) => i < firstDay ? null : i-firstDay+1);

  // ✅ Click en día del mes
  const handleDayClick = (dateStr) => {
    const dayAppts = byDate[dateStr] || [];
    if (dayAppts.length === 0) { setSelectedDate(dateStr); setView('day'); return; }
    if (dayAppts.length === 1) {
      if (isAccess) {
        const a = dayAppts[0];
        if (a.status === 'no_show') {
          setNoShowDetailAppt(a);
        } else if (a.is_entry_confirmed) {
          setActiveTab('receptions');
          setSelectedDate(a.appointment_date);
          setView('day');
        } else if (a.status !== 'cancelled') {
          setPendingActionAppt(a);
        } else {
          setSelectedDate(dateStr); setView('day');
        }
      } else {
        setSelectedDate(dateStr); setView('day');
      }
      return;
    }
    if (isAccess) setAccessDayModal(dateStr);
    else          setRecDayModal(dateStr);
  };

  const applyFilters = () => setAppliedFilters({ provider_id: filterProvider||undefined, date_from: filterDateFrom||undefined, date_to: filterDateTo||undefined });
  const clearFilters = () => { setFilterProvider(''); setFilterDateFrom(''); setFilterDateTo(''); setAppliedFilters({}); };

  // ── Render calendario compartido ──────────────────────────────────────────
  const renderCalendarMonth = () => (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map(d => <div key={d} className="py-3 text-xs font-bold text-center text-gray-500 uppercase tracking-wide">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {calCells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-28 bg-gray-50 border-b border-r border-gray-100"/>;
          const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayAppts = byDate[dateStr] || [];
          const isToday  = dateStr === todayStr;
          const dots = isAccess ? [
            dayAppts.some(a => a.has_missing_docs)  && <span key="miss" className="w-2 h-2 rounded-full bg-red-500"/>,
            dayAppts.some(a => a.status==='no_show') && <span key="ns"   className="w-2 h-2 rounded-full bg-orange-400"/>,
          ] : [
            dayAppts.some(a => a.reception_status==='rejected'||a.reception_status==='partial') && <span key="rej"  className="w-2 h-2 rounded-full bg-red-400"/>,
            dayAppts.some(a => a.status==='no_show')                                             && <span key="ns"   className="w-2 h-2 rounded-full bg-orange-400"/>,
            dayAppts.some(a => !a.is_reception_reviewed && a.status!=='no_show' && a.status!=='cancelled') && <span key="pend" className="w-2 h-2 rounded-full bg-amber-400"/>,
          ];
          const activeColor = isAccess ? 'bg-amber-500' : 'bg-teal-500';
          const hoverColor  = isAccess ? 'group-hover:bg-amber-100 group-hover:text-amber-700' : 'group-hover:bg-teal-100 group-hover:text-teal-700';
          const todayBg     = isAccess ? 'bg-amber-50' : 'bg-teal-50';
          const hoverBg     = isAccess ? 'hover:bg-amber-50/30' : 'hover:bg-teal-50/30';
          return (
            <div key={dateStr}
              className={`h-28 p-1.5 border-b border-r border-gray-100 cursor-pointer group transition-colors ${isToday?todayBg:`bg-white ${hoverBg}`}`}
              onClick={() => handleDayClick(dateStr)}>
              <div className="flex items-center justify-between mb-1">
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday?`${activeColor} text-white`:`text-gray-700 ${hoverColor}`}`}>{day}</span>
                <div className="flex items-center gap-1">
                  {dots.filter(Boolean)}
                  {dayAppts.length > 0 && <span className="text-xs font-bold text-gray-400">{dayAppts.length}</span>}
                </div>
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayAppts.slice(0,3).map(a => (
                  <div key={a.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate ${isAccess?(STATUS_COLOR[a.status]||'bg-gray-400'):getReceptionColor(a)} ${a.status==='cancelled'?'opacity-40 line-through':''}`}>
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
  );

  const renderWeek = (renderCard) => (
    isLoading
      ? <div className="flex justify-center h-48 items-center"><div className="w-10 h-10 border-4 border-t-amber-500 rounded-full animate-spin"/></div>
      : (
        <div className="space-y-4">
          {weekDays.map(dateStr => {
            const dayAppts = byDate[dateStr] || [];
            const isToday  = dateStr === todayStr;
            return (
              <div key={dateStr} className={`bg-white border-2 rounded-xl ${isToday?'border-amber-300':'border-gray-200'}`}>
                <div className={`flex items-center justify-between px-6 py-3 border-b rounded-t-xl ${isToday?'bg-amber-50 border-amber-200':'border-gray-100 bg-gray-50'}`}>
                  <h3 className={`font-bold capitalize text-sm ${isToday?'text-amber-700':'text-gray-700'}`}>
                    {fmt(dateStr)}{isToday&&<span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-md">Hoy</span>}
                  </h3>
                  <span className="text-xs text-gray-500">{dayAppts.length} visita{dayAppts.length!==1?'s':''}</span>
                </div>
                <div className="p-3 space-y-2">
                  {dayAppts.length>0 ? dayAppts.map(a => renderCard(a)) : <p className="py-4 text-sm text-center text-gray-400">Sin visitas</p>}
                </div>
              </div>
            );
          })}
        </div>
      )
  );

  const renderControls = (viewOptions) => (
    <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <button onClick={() => navigateCal(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
        <h2 className="text-lg font-bold text-gray-900 min-w-[220px] text-center capitalize">
          {view==='month'?`${MONTHS[month]} ${year}`:view==='day'?fmt(selectedDate):`${fmtShort(weekDays[0])} — ${fmtShort(weekDays[6])}`}
        </h2>
        <button onClick={() => navigateCal(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(todayStr); setWeekStart(getWeekStart(todayStr)); }}
          className={`px-3 py-1.5 text-xs font-semibold border rounded-lg hover:opacity-80 ${isAccess?'text-amber-700 bg-amber-50 border-amber-200':'text-teal-700 bg-teal-50 border-teal-200'}`}>
          Hoy
        </button>
      </div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {viewOptions.map(([val,label,Icon]) => (
          <button key={val} onClick={() => setView(val)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${view===val?`bg-white shadow-sm ${isAccess?'text-amber-700':'text-teal-700'}`:'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4"/>{label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con tabs */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-amber-500 to-orange-500">
              <Shield className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Control de Acceso</h1>
              <p className="text-sm text-gray-600">Gestión de entrada y recepciones</p>
            </div>
          </div>
          {isAccess && (
            <button onClick={() => refetchAccess()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-xl hover:bg-amber-200">
              <Clock className="w-4 h-4"/>Actualizar
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-5 p-1 bg-white/60 rounded-xl border border-amber-200 w-fit">
          <button onClick={() => { setActiveTab('access'); setShowHistory(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab==='access'?'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md':'text-amber-700 hover:bg-amber-100'}`}>
            <Shield className="w-4 h-4"/>Control de Acceso
          </button>
          <button onClick={() => { setActiveTab('receptions'); setShowHistory(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab==='receptions'?'bg-gradient-to-r from-teal-500 to-green-500 text-white shadow-md':'text-teal-700 hover:bg-teal-100'}`}>
            <FlaskConical className="w-4 h-4"/>Recepciones
          </button>
        </div>
      </div>

      {/* ── TAB: CONTROL DE ACCESO ── */}
      {activeTab === 'access' && (
        <>
          {view !== 'month' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[{label:'Total',value:accessAppointments.length,color:'blue'},{label:'Confirmadas',value:confirmed,color:'green'},{label:'Pendientes',value:pending,color:'amber'},{label:'No se presentó',value:noShows,color:'orange'}].map(s => (
                <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
                  <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {renderControls([['month','Mes',Calendar],['day','Día',LayoutGrid],['week','Semana',ListIcon]])}
          {view === 'month' && renderCalendarMonth()}
          {view === 'day' && (
            accessLoading
              ? <div className="flex justify-center h-48 items-center"><div className="w-10 h-10 border-4 border-t-amber-500 rounded-full animate-spin"/></div>
              : (
                <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">{accessAppointments.length>0?`${accessAppointments.length} visita${accessAppointments.length!==1?'s':''} programada${accessAppointments.length!==1?'s':''}` :'Sin visitas programadas'}</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {accessAppointments.length>0
                      ? accessAppointments.map(a => <AppointmentCard key={a.id} appointment={a} onConfirm={setConfirmingAppt} onNoShow={setNoShowAppt}/>)
                      : <div className="py-12 text-center"><Shield className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No hay visitas programadas</p></div>}
                  </div>
                </div>
              )
          )}
          {view === 'week' && renderWeek(a => <AppointmentCard key={a.id} appointment={a} onConfirm={setConfirmingAppt} onNoShow={setNoShowAppt}/>)}
          <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-blue-500"/>Agendada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-green-500"/>Confirmada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-gray-400"/>Completada</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600"><span className="w-3 h-3 rounded-full bg-orange-400"/>No se presentó</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 ml-2"><span className="w-2 h-2 rounded-full bg-red-500"/>Docs faltantes</span>
          </div>
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-blue-700">Haz clic en un día del calendario para gestionar las visitas. Si hay varias aparece un selector con el estado de cada una.</p>
          </div>
        </>
      )}

      {/* ── TAB: RECEPCIONES ── */}
      {activeTab === 'receptions' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${showHistory?'bg-teal-600 text-white border-teal-600':'text-teal-700 bg-teal-100 border-teal-300 hover:bg-teal-200'}`}>
              <History className="w-4 h-4"/>{showHistory?'Volver al calendario':'Historial'}
            </button>
          </div>

          {showHistory ? (
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
                    : history.length>0 ? history.map(a => <ReceptionCard key={a.id} appointment={a}/>) : <div className="py-12 text-center"><History className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No se encontraron recepciones</p></div>}
                </div>
              </div>
            </div>
          ) : (
            <>
              {view === 'day' && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[{label:'Entregas',value:recStats.today_total||0,color:'blue'},{label:'Pendientes',value:recStats.today_pending||0,color:'amber'},{label:'Aceptadas',value:recStats.today_accepted||0,color:'green'},{label:'Rechazadas',value:recStats.today_rejected||0,color:'red'}].map(s => (
                    <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
                      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
                      <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {renderControls([['month','Mes',Calendar],['day','Día',FlaskConical],['week','Semana',ListIcon]])}
              {view === 'month' && renderCalendarMonth()}
              {view === 'day' && (
                recLoading
                  ? <div className="flex justify-center h-48 items-center"><div className="w-10 h-10 border-4 border-t-teal-500 rounded-full animate-spin"/></div>
                  : (
                    <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                        <FlaskConical className="w-5 h-5 text-teal-600"/>
                        <div><h2 className="font-bold text-gray-900">Entregas del día</h2><p className="text-xs text-gray-500">{recAppointments.length} entrega{recAppointments.length!==1?'s':''} programada{recAppointments.length!==1?'s':''}</p></div>
                      </div>
                      <div className="p-4 space-y-3">
                        {recAppointments.length>0
                          ? recAppointments.map(a => <ReceptionCard key={a.id} appointment={a}/>)
                          : <div className="py-12 text-center"><FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No hay entregas para este día</p></div>}
                      </div>
                    </div>
                  )
              )}
              {view === 'week' && renderWeek(a => <ReceptionCard key={a.id} appointment={a}/>)}
              <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-blue-500"/>Agendada</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-teal-500"/>Aceptada</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><span className="w-3 h-3 rounded-full bg-amber-500"/>Parcial</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><span className="w-3 h-3 rounded-full bg-red-500"/>Rechazada</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600"><span className="w-3 h-3 rounded-full bg-orange-400"/>No se presentó</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-blue-700">Vista de solo consulta. Haz clic en el chevron de cada entrega para ver el detalle por producto.</p>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modales ── */}
      {confirmingAppt    && <ConfirmEntryModal  appointment={confirmingAppt}    onClose={() => setConfirmingAppt(null)}/>}
      {noShowAppt        && <NoShowModal        appointment={noShowAppt}        onClose={() => setNoShowAppt(null)}/>}
      {noShowDetailAppt  && <NoShowDetailModal  appointment={noShowDetailAppt}  onClose={() => setNoShowDetailAppt(null)}/>}
      {pendingActionAppt && (
        <PendingActionModal
          appointment={pendingActionAppt}
          onConfirm={() => { const a = pendingActionAppt; setPendingActionAppt(null); setConfirmingAppt(a); }}
          onNoShow={() => { const a = pendingActionAppt; setPendingActionAppt(null); setNoShowAppt(a); }}
          onClose={() => setPendingActionAppt(null)}
        />
      )}

      {/* ── Selectores de día ── */}
      {accessDayModal && (
        <DayAppointmentsModal
          dateStr={accessDayModal}
          appointments={accessByDate[accessDayModal] || []}
          mode="access"
          onSelect={(a) => {
            setAccessDayModal(null);
            if (a.status === 'no_show') {
              setNoShowDetailAppt(a);
            } else if (a.is_entry_confirmed) {
              setActiveTab('receptions');
              setSelectedDate(a.appointment_date);
              setView('day');
            } else if (a.status !== 'cancelled') {
              setPendingActionAppt(a);
            } else {
              setSelectedDate(accessDayModal);
              setView('day');
            }
          }}
          onClose={() => setAccessDayModal(null)}
        />
      )}
      {recDayModal && (
        <DayAppointmentsModal
          dateStr={recDayModal}
          appointments={recByDate[recDayModal] || []}
          mode="receptions"
          onSelect={(a) => { setRecDayModal(null); setSelectedDate(recDayModal); setView('day'); }}
          onClose={() => setRecDayModal(null)}
        />
      )}
    </div>
  );
};
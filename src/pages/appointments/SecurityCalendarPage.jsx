import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  Shield, Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Truck, User, X, AlertCircle,
  FileText, LayoutGrid, List as ListIcon, Info, Timer,
} from 'lucide-react';

const TYPE_CONFIG = {
  entrega:     { label:'Entrega de mercancía',    dot:'bg-blue-500',   bg:'bg-blue-50',   border:'border-blue-200'   },
  residuos:    { label:'Recolección de residuos', dot:'bg-green-500',  bg:'bg-green-50',  border:'border-green-200'  },
  auditoria:   { label:'Auditoría / Calidad',     dot:'bg-purple-500', bg:'bg-purple-50', border:'border-purple-200' },
  calibracion: { label:'Calibración de equipos',  dot:'bg-amber-500',  bg:'bg-amber-50',  border:'border-amber-200'  },
  servicio:    { label:'Servicio general',        dot:'bg-gray-500',   bg:'bg-gray-50',   border:'border-gray-200'   },
};

const fmt      = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
const fmtShort = (d) => new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'});

// ─── Modal confirmar entrada ──────────────────────────────────────────────────
const ConfirmEntryModal = ({ appointment, onClose }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes]               = useState('');
  const [arrivalTime, setArrivalTime]   = useState(() => new Date().toTimeString().slice(0,5));
  const [physicalDocs, setPhysicalDocs] = useState({});
  const [docsChecked, setDocsChecked]   = useState(false);

  // Obtener configuración de docs físicos
  const { data: docsConfig } = useQuery({
    queryKey: ['physical-docs-config', appointment.id],
    queryFn: () => appointmentService.getPhysicalDocsConfig(appointment.id),
    staleTime: 60 * 1000,
  });

  const requiresDocs = docsConfig?.requires_docs && appointment.type === 'entrega';

  // Inicializar todos los docs como presentes (true) al cargar
  React.useEffect(() => {
    if (docsConfig?.docs?.length) {
      const initial = {};
      docsConfig.docs.forEach(d => { initial[d.key] = true; });
      setPhysicalDocs(initial);
    }
  }, [docsConfig]);

  // Calcular retraso en tiempo real
  const [scheduled] = appointment.appointment_time?.split(':') || ['0','0'];
  const [actualH, actualM] = arrivalTime.split(':').map(Number);
  const scheduledMins = parseInt(scheduled) * 60 + parseInt(appointment.appointment_time?.split(':')[1] || 0);
  const actualMins    = actualH * 60 + actualM;
  const delayMins     = Math.max(0, actualMins - scheduledMins);
  const onTime        = delayMins === 0;

  const toggleDoc = (key) => setPhysicalDocs(prev => ({ ...prev, [key]: !prev[key] }));

  const missingRequired = requiresDocs
    ? (docsConfig?.docs || []).filter(d => d.required && !physicalDocs[d.key])
    : [];

  const mutation = useMutation({
    mutationFn: () => appointmentService.confirmEntry(appointment.id, {
      actual_arrival_time: arrivalTime,
      entry_notes: notes || null,
      physical_docs: requiresDocs ? physicalDocs : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['security-appointments']);
      showToast.success('Entrada confirmada correctamente');
      onClose();
    },
    onError: () => showToast.error('Error al confirmar entrada'),
  });

  const typeCfg = TYPE_CONFIG[appointment.type] || TYPE_CONFIG.servicio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Confirmar entrada</h2>
              <p className="text-xs text-gray-500">{appointment.provider?.business_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info de la cita */}
          <div className={`p-3 rounded-xl border-2 ${typeCfg.border} ${typeCfg.bg} space-y-1.5`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${typeCfg.dot}`}/>
              <p className="font-bold text-gray-900 text-sm">{appointment.provider?.business_name}</p>
            </div>
            <p className="text-xs text-gray-500">{typeCfg.label} · Cita a las {appointment.appointment_time} hrs</p>
            {appointment.vehicle_display && (
              <p className="text-xs text-gray-600 flex items-center gap-1"><Truck className="w-3 h-3"/>{appointment.vehicle_display}</p>
            )}
            {appointment.driver_display && (
              <p className="text-xs text-gray-600 flex items-center gap-1"><User className="w-3 h-3"/>{appointment.driver_display}</p>
            )}
          </div>

          {/* Hora real de llegada */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              <Timer className="inline w-4 h-4 mr-1 text-amber-600"/>
              Hora real de llegada *
            </label>
            <input
              type="time"
              value={arrivalTime}
              onChange={e => setArrivalTime(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
            />
            {/* Indicador de puntualidad */}
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
              onTime ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {onTime
                ? <><CheckCircle className="w-4 h-4"/>Llegó a tiempo</>
                : <><XCircle className="w-4 h-4"/>Retraso de {delayMins} minuto{delayMins !== 1 ? 's' : ''}</>
              }
            </div>
          </div>

          {/* Checklist docs físicos — solo MP y ME / Insumos Generales en entregas */}
          {requiresDocs && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                <FileText className="inline w-4 h-4 mr-1 text-amber-600"/>
                Documentos presentados
                <span className="ml-1 text-xs font-normal text-gray-400">({docsConfig.provider_type})</span>
              </label>
              <div className="space-y-2">
                {(docsConfig?.docs || []).map(doc => (
                  <label key={doc.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      physicalDocs[doc.key]
                        ? 'border-green-300 bg-green-50'
                        : doc.required
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={!!physicalDocs[doc.key]}
                      onChange={() => toggleDoc(doc.key)}
                      className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${physicalDocs[doc.key] ? 'text-green-800' : 'text-gray-700'}`}>
                        {doc.label}
                      </p>
                      {!doc.required && (
                        <p className="text-xs text-gray-400">Opcional</p>
                      )}
                    </div>
                    {physicalDocs[doc.key]
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>
                      : doc.required
                        ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>
                        : null
                    }
                  </label>
                ))}
              </div>

              {/* Alerta si faltan docs requeridos */}
              {missingRequired.length > 0 && (
                <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-xs font-semibold text-red-700">Documentos faltantes ({missingRequired.length}):</p>
                    <p className="text-xs text-red-600">{missingRequired.map(d => d.label).join(', ')}</p>
                    <p className="text-xs text-red-500 mt-1">Se notificará a Compras al confirmar la entrada.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notas opcionales */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Notas <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
              placeholder="Ej. Vehículo verificado, sin novedades..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none"/>
          </div>

          <div className="flex gap-3">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}
              leftIcon={<CheckCircle className="w-4 h-4"/>}
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

// ─── Tarjeta de cita ──────────────────────────────────────────────────────────
const AppointmentCard = ({ appointment, onConfirm }) => {
  const typeCfg    = TYPE_CONFIG[appointment.type] || TYPE_CONFIG.servicio;
  const isConfirmed = appointment.is_entry_confirmed;
  const hasMissing  = appointment.has_missing_docs;
  const missingDocs = (appointment.physical_docs_status || []).filter(d => d.missing && d.required);

  return (
    <div className={`rounded-xl border-2 transition-all ${
      isConfirmed
        ? hasMissing ? 'border-red-200 bg-red-50/20' : 'border-green-200 bg-green-50/30'
        : `${typeCfg.border} bg-white hover:shadow-md`
    }`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Hora */}
          <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl font-bold text-lg ${
            isConfirmed
              ? hasMissing ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {appointment.appointment_time?.slice(0,5)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${typeCfg.dot}`}/>
              <p className="font-bold text-gray-900 truncate">{appointment.provider?.business_name}</p>

              {/* Badge entrada */}
              {isConfirmed && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  hasMissing
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {hasMissing ? <AlertCircle className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                  Entró {appointment.entry_confirmed_at}
                </span>
              )}

              {/* Badge puntualidad */}
              {isConfirmed && appointment.arrived_on_time !== null && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  appointment.arrived_on_time
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-orange-100 text-orange-700 border-orange-200'
                }`}>
                  <Timer className="w-3 h-3"/>
                  {appointment.arrived_on_time ? 'A tiempo' : `+${appointment.delay_minutes} min`}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">{typeCfg.label}</p>

            {appointment.is_completed_by_provider ? (
              <div className="flex flex-wrap gap-3 mt-1">
                {appointment.vehicle_display && (
                  <span className="flex items-center gap-1 text-xs text-gray-600"><Truck className="w-3 h-3 text-gray-400"/>{appointment.vehicle_display}</span>
                )}
                {appointment.driver_display && (
                  <span className="flex items-center gap-1 text-xs text-gray-600"><User className="w-3 h-3 text-gray-400"/>{appointment.driver_display}</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3"/>Proveedor aún no completó vehículo/chofer
              </p>
            )}

            {/* Docs faltantes */}
            {isConfirmed && hasMissing && missingDocs.length > 0 && (
              <div className="mt-1.5 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-red-600">
                  Falta: {missingDocs.map(d => d.label).join(', ')}
                </p>
              </div>
            )}

            {appointment.products && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <FileText className="w-3 h-3"/>{appointment.products}
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 ml-4">
          {isConfirmed ? (
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${hasMissing ? 'bg-red-100' : 'bg-green-100'}`}>
              {hasMissing
                ? <AlertCircle className="w-6 h-6 text-red-600"/>
                : <CheckCircle className="w-6 h-6 text-green-600"/>
              }
            </div>
          ) : (
            <Button size="sm" onClick={() => onConfirm(appointment)}
              leftIcon={<Shield className="w-3.5 h-3.5"/>}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold whitespace-nowrap">
              Confirmar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const SecurityCalendarPage = () => {
  const [view, setView]                     = useState('day');
  const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().split('T')[0]);
  const [confirmingAppt, setConfirmingAppt] = useState(null);

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); return d.toISOString().split('T')[0];
  });

  const params = view === 'day' ? { date: selectedDate } : { view: 'week', week_start: weekStart };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-appointments', view, view==='day' ? selectedDate : weekStart],
    queryFn: () => appointmentService.securityGetAppointments(params),
    refetchInterval: 60 * 1000,
  });

  const appointments = data?.appointments || [];
  const confirmed    = appointments.filter(a => a.is_entry_confirmed).length;
  const pending      = appointments.filter(a => !a.is_entry_confirmed).length;
  const withMissing  = appointments.filter(a => a.has_missing_docs).length;

  const navigateCal = (dir) => {
    if (view === 'day') {
      const d = new Date(selectedDate); d.setDate(d.getDate()+dir);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(weekStart); d.setDate(d.getDate()+dir*7);
      setWeekStart(d.toISOString().split('T')[0]);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const byDate   = {};
  if (view === 'week') appointments.forEach(a => { if (!byDate[a.appointment_date]) byDate[a.appointment_date]=[]; byDate[a.appointment_date].push(a); });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-amber-500 to-orange-500">
            <Shield className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Control de Acceso</h1>
            <p className="text-sm text-gray-600">Gestión de entrada de proveedores</p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-xl hover:bg-amber-200">
          <Clock className="w-4 h-4"/>Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label:'Total',           value:appointments.length, color:'blue'  },
          { label:'Confirmadas',     value:confirmed,           color:'green' },
          { label:'Pendientes',      value:pending,             color:'amber' },
          { label:'Docs faltantes',  value:withMissing,         color:'red'   },
        ].map(s => (
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateCal(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[220px] text-center capitalize">
            {view==='day' ? fmt(selectedDate) : `${fmtShort(weekDays[0])} — ${fmtShort(weekDays[6])}`}
          </h2>
          <button onClick={() => navigateCal(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
          <button onClick={() => { setSelectedDate(todayStr); setWeekStart(getWeekStart(todayStr)); }}
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
            Hoy
          </button>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['day','Hoy',LayoutGrid],['week','Semana',ListIcon]].map(([val,label,Icon]) => (
            <button key={val} onClick={() => setView(val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                view===val ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4"/>{label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-t-amber-500 rounded-full animate-spin"/>
        </div>
      ) : view === 'day' ? (
        <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">
              {appointments.length > 0
                ? `${appointments.length} visita${appointments.length!==1?'s':''} programada${appointments.length!==1?'s':''}`
                : 'Sin visitas programadas para hoy'}
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {appointments.length > 0
              ? appointments.map(a => <AppointmentCard key={a.id} appointment={a} onConfirm={setConfirmingAppt}/>)
              : (<div className="py-12 text-center"><Shield className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-500">No hay visitas programadas</p></div>)
            }
          </div>
        </div>
      ) : (
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
                  {dayAppts.length > 0
                    ? dayAppts.map(a => <AppointmentCard key={a.id} appointment={a} onConfirm={setConfirmingAppt}/>)
                    : <p className="py-4 text-sm text-center text-gray-400">Sin visitas</p>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">
          Confirma la entrada registrando la hora real de llegada. Para proveedores de MP y ME e Insumos Generales, verifica los documentos físicos. Los documentos faltantes se notificarán a Compras automáticamente.
        </p>
      </div>

      {confirmingAppt && (
        <ConfirmEntryModal appointment={confirmingAppt} onClose={() => setConfirmingAppt(null)}/>
      )}
    </div>
  );
};
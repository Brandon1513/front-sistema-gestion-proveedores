import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  Calendar, Clock, FileText, Download, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Paperclip, AlertCircle, Truck, User,
  X, Edit3, Info,
} from 'lucide-react';

const TYPE_CONFIG = {
  entrega:     {label:'Entrega de mercancía',   dot:'bg-blue-500',  bg:'bg-blue-50 border-blue-200',    text:'text-blue-800'},
  residuos:    {label:'Recolección de residuos',dot:'bg-green-500', bg:'bg-green-50 border-green-200',  text:'text-green-800'},
  auditoria:   {label:'Auditoría / Calidad',    dot:'bg-purple-500',bg:'bg-purple-50 border-purple-200',text:'text-purple-800'},
  calibracion: {label:'Calibración de equipos', dot:'bg-amber-500', bg:'bg-amber-50 border-amber-200',  text:'text-amber-800'},
  servicio:    {label:'Servicio general',       dot:'bg-gray-500',  bg:'bg-gray-50 border-gray-200',    text:'text-gray-700'},
};
const STATUS_CONFIG = {
  scheduled:{label:'Agendada',  color:'bg-blue-100 text-blue-800',  icon:Clock},
  confirmed:{label:'Confirmada',color:'bg-green-100 text-green-800',icon:CheckCircle},
  cancelled:{label:'Cancelada', color:'bg-red-100 text-red-800',    icon:XCircle},
  completed:{label:'Completada',color:'bg-gray-100 text-gray-700',  icon:CheckCircle},
};

const CompleteModal=({appointment,vehicles,personnel,onClose})=>{
  const queryClient=useQueryClient();
  const [vehicleMode,setVehicleMode]=useState(appointment.vehicle_id?'catalog':'custom');
  const [personnelMode,setPersonnelMode]=useState(appointment.personnel_id?'catalog':'custom');
  const [form,setForm]=useState({vehicle_id:appointment.vehicle_id||'',vehicle_custom:appointment.vehicle_custom||'',personnel_id:appointment.personnel_id||'',driver_custom:appointment.driver_custom||'',provider_notes:appointment.provider_notes||''});
  const [error,setError]=useState('');
  const mutation=useMutation({
    mutationFn:(data)=>appointmentService.providerComplete(appointment.id,data),
    onSuccess:()=>{queryClient.invalidateQueries(['provider-appointments']);showToast.success('¡Información completada!');onClose();},
    onError:(err)=>setError(err.response?.data?.message||'Error al guardar'),
  });
  const set=(key,val)=>setForm(f=>({...f,[key]:val}));
  const handleSubmit=(e)=>{
    e.preventDefault();setError('');
    const payload={provider_notes:form.provider_notes};
    if(vehicleMode==='catalog'){payload.vehicle_id=form.vehicle_id||null;payload.vehicle_custom=null;}
    else{payload.vehicle_custom=form.vehicle_custom||null;payload.vehicle_id=null;}
    if(personnelMode==='catalog'){payload.personnel_id=form.personnel_id||null;payload.driver_custom=null;}
    else{payload.driver_custom=form.driver_custom||null;payload.personnel_id=null;}
    mutation.mutate(payload);
  };
  const dateFormatted=new Date(appointment.appointment_date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long'});
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3"><div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary shadow-md"><Edit3 className="w-5 h-5 text-white"/></div><div><h2 className="text-lg font-bold text-gray-900">Completar información</h2><p className="text-xs text-gray-500 capitalize">{dateFormatted} · {appointment.appointment_time} hrs</p></div></div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200"><Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/><p className="text-xs text-blue-700">Indica qué vehículo y personal asistirá. Esta información ayuda a DASAVENA a preparar el acceso.</p></div>

          {/* Vehículo */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Truck className="inline w-4 h-4 mr-1 text-primary-600"/>Vehículo</label>
            <div className="flex gap-2 mb-2">{[['catalog','Del catálogo'],['custom','Escribir']].map(([mode,label])=>(<button key={mode} type="button" onClick={()=>setVehicleMode(mode)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${vehicleMode===mode?'bg-primary-600 text-white border-primary-600':'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}>{label}</button>))}</div>
            {vehicleMode==='catalog'?(
              <><select value={form.vehicle_id} onChange={e=>set('vehicle_id',e.target.value)} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"><option value="">Sin especificar...</option>{vehicles.map(v=>(<option key={v.id} value={v.id}>{v.brand_model} — {v.plates}</option>))}</select>
              {vehicles.length===0&&<p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>No tienes vehículos en tu perfil. Usa "Escribir" o agrégalos en <strong>Mi Perfil</strong>.</p>}</>
            ):(
              <><input type="text" value={form.vehicle_custom} onChange={e=>set('vehicle_custom',e.target.value)} placeholder="Ej. Camión Kenworth blanco, placas ABC-123" className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-1"><Info className="w-3 h-3 flex-shrink-0"/>¿Este vehículo es recurrente? Agrégalo en <strong className="text-primary-600 ml-0.5">Mi Perfil → Vehículos</strong> para no tener que escribirlo cada vez.</p></>
            )}
          </div>

          {/* Chofer */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><User className="inline w-4 h-4 mr-1 text-primary-600"/>Chofer / Personal</label>
            <div className="flex gap-2 mb-2">{[['catalog','Del catálogo'],['custom','Escribir']].map(([mode,label])=>(<button key={mode} type="button" onClick={()=>setPersonnelMode(mode)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${personnelMode===mode?'bg-primary-600 text-white border-primary-600':'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}>{label}</button>))}</div>
            {personnelMode==='catalog'?(
              <><select value={form.personnel_id} onChange={e=>set('personnel_id',e.target.value)} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"><option value="">Sin especificar...</option>{personnel.map(p=>(<option key={p.id} value={p.id}>{p.full_name} — {p.position}</option>))}</select>
              {personnel.length===0&&<p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>No tienes personal registrado. Usa "Escribir" o agrégalo en <strong>Mi Perfil</strong>.</p>}</>
            ):(
              <><input type="text" value={form.driver_custom} onChange={e=>set('driver_custom',e.target.value)} placeholder="Nombre completo del chofer o persona" className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-1"><Info className="w-3 h-3 flex-shrink-0"/>¿Esta persona viene seguido? Agrégala en <strong className="text-primary-600 ml-0.5">Mi Perfil → Personal</strong> para seleccionarla rápidamente.</p></>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Notas adicionales <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea value={form.provider_notes} onChange={e=>set('provider_notes',e.target.value)} rows={3} maxLength={1000} placeholder="Ej. Llegaremos 10 min antes, el camión necesita acceso por puerta trasera..." className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/>
          </div>

          {error&&(<div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50"><AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/><p className="text-sm text-red-700">{error}</p></div>)}
          <div className="flex gap-3 pt-2"><Button type="submit" loading={mutation.isPending} className="flex-1">Guardar información</Button><Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button></div>
        </form>
      </div>
    </div>
  );
};

const AppointmentCard=({appointment,isPast,vehicles,personnel})=>{
  const [expanded,setExpanded]=useState(false);
  const [showCompleteModal,setShowCompleteModal]=useState(false);
  const typeCfg=TYPE_CONFIG[appointment.type]||TYPE_CONFIG.servicio;
  const statusCfg=STATUS_CONFIG[appointment.status]||STATUS_CONFIG.scheduled;
  const StatusIcon=statusCfg.icon;
  const needsCompletion=!appointment.is_completed_by_provider&&appointment.status!=='cancelled'&&!isPast;
  const dateFormatted=new Date(appointment.appointment_date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  return(
    <>
      <div className={`rounded-xl border-2 transition-all duration-200 ${appointment.status==='cancelled'?'border-gray-200 bg-gray-50 opacity-70':needsCompletion?'border-amber-300 bg-amber-50/30 shadow-sm':isPast?'border-gray-200 bg-white':'border-primary-200 bg-white shadow-sm hover:shadow-md'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className={`flex-shrink-0 w-3 h-3 rounded-full ${typeCfg.dot}`}/>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeCfg.bg} ${typeCfg.text}`}>{typeCfg.label}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}><StatusIcon className="w-3 h-3"/>{statusCfg.label}</span>
                {appointment.is_completed_by_provider&&(<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3"/>Info completada</span>)}
                {appointment.has_attachment&&(<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"><Paperclip className="w-3 h-3"/>Adjunto</span>)}
              </div>
              <p className="text-sm font-semibold text-gray-800 capitalize flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary-500 flex-shrink-0"/>{dateFormatted} · <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"/>{appointment.appointment_time} hrs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {needsCompletion&&(<Button variant="accent" size="sm" onClick={()=>setShowCompleteModal(true)} leftIcon={<Edit3 className="w-3.5 h-3.5"/>}>Completar info</Button>)}
            <button onClick={()=>setExpanded(!expanded)} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">{expanded?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}</button>
          </div>
        </div>
        {needsCompletion&&!expanded&&(<div className="flex items-center gap-2 px-4 pb-3"><AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"/><p className="text-xs text-amber-700">Completa la información de vehículo y chofer antes de tu visita</p></div>)}
        {expanded&&(
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3 mt-1">
            {appointment.is_completed_by_provider?(
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-1.5">
                <p className="text-xs font-semibold text-green-700">Tu información</p>
                {appointment.vehicle_display&&(<p className="text-sm text-green-800 flex items-center gap-2"><Truck className="w-3.5 h-3.5 flex-shrink-0"/>{appointment.vehicle_display}</p>)}
                {appointment.driver_display&&(<p className="text-sm text-green-800 flex items-center gap-2"><User className="w-3.5 h-3.5 flex-shrink-0"/>{appointment.driver_display}</p>)}
                {appointment.provider_notes&&(<p className="text-sm text-green-700 italic border-t border-green-200 pt-1.5">"{appointment.provider_notes}"</p>)}
                <button onClick={()=>setShowCompleteModal(true)} className="text-xs text-green-600 underline hover:text-green-800">Modificar información</button>
              </div>
            ):needsCompletion?(<div className="p-3 rounded-lg bg-amber-50 border border-amber-200"><p className="text-xs text-amber-700 mb-2">Aún no has completado la información.</p><Button variant="accent" size="sm" onClick={()=>setShowCompleteModal(true)} leftIcon={<Edit3 className="w-3.5 h-3.5"/>}>Completar ahora</Button></div>):null}
            {appointment.products&&(<div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200"><FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5"/><div><p className="text-xs text-gray-400 mb-0.5">Descripción / Productos</p><p className="text-sm text-gray-800">{appointment.products}</p></div></div>)}
            {appointment.notes&&(<div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200"><Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/><div><p className="text-xs text-blue-600 mb-0.5">Observaciones de DASAVENA</p><p className="text-sm text-blue-900">{appointment.notes}</p></div></div>)}
            {appointment.has_attachment&&(<button onClick={()=>appointmentService.downloadAttachment(appointment.id,appointment.attachment_name)} className="flex items-center gap-2 w-full p-3 rounded-lg bg-primary-50 border border-primary-200 hover:bg-primary-100 text-left"><Paperclip className="w-4 h-4 text-primary-600 flex-shrink-0"/><div className="flex-1 min-w-0"><p className="text-xs text-primary-500">Documento de DASAVENA</p><p className="text-sm font-semibold text-primary-800 truncate">{appointment.attachment_name}</p></div><Download className="w-4 h-4 text-primary-600"/></button>)}
            {appointment.status==='cancelled'&&appointment.cancellation_reason&&(<div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"><XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/><div><p className="text-xs text-red-500 mb-0.5">Motivo de cancelación</p><p className="text-sm text-red-800">{appointment.cancellation_reason}</p></div></div>)}
          </div>
        )}
      </div>
      {showCompleteModal&&(<CompleteModal appointment={appointment} vehicles={vehicles} personnel={personnel} onClose={()=>setShowCompleteModal(false)}/>)}
    </>
  );
};

export const ProviderAppointmentsPage=()=>{
  const {data,isLoading}=useQuery({queryKey:['provider-appointments'],queryFn:appointmentService.myAppointments,refetchInterval:5*60*1000});
  const {data:vehiclesData}=useQuery({queryKey:['my-vehicles'],queryFn:async()=>{const r=await fetch('/api/provider/vehicles',{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,Accept:'application/json'}});return r.json();},staleTime:5*60*1000});
  const {data:personnelData}=useQuery({queryKey:['my-personnel'],queryFn:async()=>{const r=await fetch('/api/provider/personnel',{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,Accept:'application/json'}});return r.json();},staleTime:5*60*1000});
  const vehicles=vehiclesData?.vehicles||vehiclesData?.data||[];
  const personnel=personnelData?.personnel||personnelData?.data||[];
  const upcoming=data?.upcoming||[];
  const past=data?.past||[];
  const pendingCompletion=upcoming.filter(a=>!a.is_completed_by_provider&&a.status!=='cancelled');
  const cardProps={vehicles,personnel};
  if(isLoading) return(<div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"/><p className="text-gray-600">Cargando citas...</p></div></div>);
  return(
    <div className="space-y-6">
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><Calendar className="w-6 h-6 text-white"/></div><div><h1 className="text-3xl font-bold text-gray-900">Mis Citas</h1><p className="text-sm text-gray-600">Consulta y completa tu información para cada visita a DASAVENA</p></div></div></div>
      {pendingCompletion.length>0&&(<div className="flex items-start gap-3 p-4 border-2 border-amber-300 rounded-xl bg-amber-50"><AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"/><div><p className="font-semibold text-amber-800">Tienes {pendingCompletion.length} cita{pendingCompletion.length>1?'s':''} pendiente{pendingCompletion.length>1?'s':''} de completar</p><p className="text-sm text-amber-700 mt-0.5">Indica el vehículo y chofer que asistirá para que DASAVENA prepare el acceso.</p></div></div>)}
      <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100"><div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-lg"><Calendar className="w-4 h-4 text-primary-600"/></div><div><h2 className="font-bold text-gray-900">Próximas Citas</h2><p className="text-xs text-gray-500">{upcoming.length} cita{upcoming.length!==1?'s':''} programada{upcoming.length!==1?'s':''}</p></div></div>
        <div className="p-4 space-y-3">
          {upcoming.length>0?upcoming.map(a=>(<AppointmentCard key={a.id} appointment={a} isPast={false} {...cardProps}/>)):(
            <div className="py-12 text-center"><div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50"><Calendar className="w-8 h-8 text-primary-400"/></div><p className="font-medium text-gray-700">No tienes citas próximas</p><p className="mt-1 text-sm text-gray-400">El equipo de Compras de DASAVENA te notificará cuando se agende una visita</p></div>
          )}
        </div>
      </div>
      {past.length>0&&(
        <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100"><div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg"><Clock className="w-4 h-4 text-gray-500"/></div><div><h2 className="font-bold text-gray-700">Historial</h2><p className="text-xs text-gray-400">Últimas {past.length} citas</p></div></div>
          <div className="p-4 space-y-3">{past.map(a=>(<AppointmentCard key={a.id} appointment={a} isPast={true} {...cardProps}/>))}</div>
        </div>
      )}
    </div>
  );
};
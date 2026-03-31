import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../api/appointmentService';
import { providerService } from '../../api/providerService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import api from '../../api/axios';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, X,
  Building2, FileText, Download, CheckCircle, XCircle,
  LayoutGrid, List, Tag, Paperclip, AlertCircle, Truck,
  User, Info, ShieldCheck, ShieldX, Timer,
} from 'lucide-react';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HOURS  = Array.from({length:11},(_,i)=>`${(i+8).toString().padStart(2,'0')}:00`);
const TYPE_OPTIONS = [
  {value:'entrega',    label:'Entrega de mercancía',    color:'bg-blue-500'},
  {value:'residuos',   label:'Recolección de residuos', color:'bg-green-500'},
  {value:'auditoria',  label:'Auditoría / Calidad',     color:'bg-purple-500'},
  {value:'calibracion',label:'Calibración de equipos',  color:'bg-amber-500'},
  {value:'servicio',   label:'Servicio general',        color:'bg-gray-500'},
];
const STATUS_CONFIG = {
  scheduled:{label:'Agendada',  color:'bg-blue-100 text-blue-800',  icon:Clock},
  confirmed:{label:'Confirmada',color:'bg-green-100 text-green-800',icon:CheckCircle},
  cancelled:{label:'Cancelada', color:'bg-red-100 text-red-800',    icon:XCircle},
  completed:{label:'Completada',color:'bg-gray-100 text-gray-800',  icon:CheckCircle},
};
const typeColor=(type)=>TYPE_OPTIONS.find(t=>t.value===type)?.color||'bg-gray-500';

const useProviderEligibility=(providerId)=>useQuery({
  queryKey:['provider-eligibility',providerId],
  queryFn:async()=>{
    if(!providerId) return null;
    const provRes=await api.get(`/providers/${providerId}`);
    const provider=provRes.data?.provider||provRes.data;
    const docsRes=await api.get(`/providers/${providerId}/documents/required`);
    const requiredDocs=docsRes.data?.required_documents||[];
    const issues=[];
    if(provider.status!=='active') issues.push(`Proveedor en estado "${provider.status}"`);
    const notApproved=requiredDocs.filter(d=>d.is_required&&(!d.uploaded||d.uploaded_document?.status!=='approved'));
    if(notApproved.length>0) issues.push(`Documentos sin aprobar: ${notApproved.slice(0,3).map(d=>d.name).join(', ')}${notApproved.length>3?` y ${notApproved.length-3} más`:''}`);
    const expired=requiredDocs.filter(d=>d.uploaded_document?.expiry_date&&new Date(d.uploaded_document.expiry_date)<new Date());
    if(expired.length>0) issues.push(`${expired.length} documento(s) vencido(s)`);
    return {eligible:issues.length===0,issues,provider};
  },
  enabled:!!providerId,staleTime:2*60*1000,retry:false,
});

const AppointmentModal=({appointment,onClose,preselectedDate})=>{
  const queryClient=useQueryClient();
  const isEdit=!!appointment;
  const [form,setForm]=useState({
    provider_id:appointment?.provider?.id||'',
    appointment_date:appointment?.appointment_date||preselectedDate||'',
    appointment_time:appointment?.appointment_time?.slice(0,5)||'09:00',
    type:appointment?.type||'entrega',
    products:appointment?.products||'',
    notes:appointment?.notes||'',
    status:appointment?.status||'scheduled',
    attachment:null,
  });
  const [error,setError]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const {data:providersData}=useQuery({queryKey:['providers-select'],queryFn:()=>providerService.getAll({per_page:200}),staleTime:5*60*1000});
  const providers=providersData?.data||providersData?.providers||[];
  const {data:eligibility,isLoading:checkingEligibility}=useProviderEligibility(!isEdit&&form.provider_id?form.provider_id:null);
  const mutation=useMutation({
    mutationFn:isEdit?(data)=>appointmentService.update(appointment.id,data):appointmentService.create,
    onSuccess:()=>{queryClient.invalidateQueries(['appointments']);showToast.success(isEdit?'Cita actualizada':'¡Cita agendada!');onClose();},
    onError:(err)=>{const errs=err.response?.data?.errors;setError(errs?Object.values(errs).flat().join(' · '):(err.response?.data?.message||'Error al guardar'));},
  });
  const set=(key,val)=>{setForm(f=>({...f,[key]:val}));if(key==='provider_id')setConfirmed(false);};
  const handleSubmit=(e)=>{
    e.preventDefault();setError('');
    if(!form.provider_id){setError('Selecciona un proveedor');return;}
    if(!isEdit&&eligibility&&!eligibility.eligible&&!confirmed){setError('Confirma que deseas agendar marcando la casilla');return;}
    mutation.mutate(form);
  };
  const isNotEligible=!isEdit&&eligibility&&!eligibility.eligible;
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary shadow-md"><Calendar className="w-5 h-5 text-white"/></div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit?'Editar Cita':'Nueva Cita'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isEdit&&(<div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200"><Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/><p className="text-xs text-blue-700">El proveedor completará vehículo y chofer desde su portal.</p></div>)}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Building2 className="inline w-4 h-4 mr-1 text-primary-600"/>Proveedor *</label>
            <select value={form.provider_id} onChange={e=>set('provider_id',e.target.value)} required className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">
              <option value="">Selecciona un proveedor...</option>
              {providers.map(p=>(<option key={p.id} value={p.id}>{p.business_name} — {p.rfc}</option>))}
            </select>
            {form.provider_id&&!isEdit&&checkingEligibility&&(<div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><div className="w-3 h-3 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"/>Verificando...</div>)}
            {!isEdit&&eligibility?.eligible&&(<div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200"><ShieldCheck className="w-4 h-4 text-green-600"/><p className="text-xs text-green-700 font-medium">Proveedor activo con documentación al día ✓</p></div>)}
            {!isEdit&&isNotEligible&&(
              <div className="mt-2 p-3 rounded-xl border-2 border-red-200 bg-red-50 space-y-2">
                <div className="flex items-center gap-2"><ShieldX className="w-4 h-4 text-red-600"/><p className="text-xs font-semibold text-red-700">Pendientes:</p></div>
                <ul className="space-y-1 pl-6">{eligibility.issues.map((i,idx)=>(<li key={idx} className="text-xs text-red-600 list-disc">{i}</li>))}</ul>
                <label className="flex items-start gap-2 mt-3 pt-2 border-t border-red-200 cursor-pointer">
                  <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded"/>
                  <span className="text-xs text-red-700">Entiendo los pendientes y deseo agendar de todas formas</span>
                </label>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1.5 text-sm font-semibold text-gray-700">Fecha *</label><input type="date" value={form.appointment_date} onChange={e=>set('appointment_date',e.target.value)} min={new Date().toISOString().split('T')[0]} required className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/></div>
            <div><label className="block mb-1.5 text-sm font-semibold text-gray-700">Hora *</label><select value={form.appointment_time} onChange={e=>set('appointment_time',e.target.value)} required className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">{HOURS.map(h=>(<option key={h} value={h}>{h} hrs</option>))}</select></div>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700"><Tag className="inline w-4 h-4 mr-1 text-primary-600"/>Tipo *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{TYPE_OPTIONS.map(opt=>(<button key={opt.value} type="button" onClick={()=>set('type',opt.value)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.type===opt.value?'border-primary-500 bg-primary-50 text-primary-700':'border-gray-200 text-gray-600 hover:border-gray-300'}`}><span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.color}`}/>{opt.label}</button>))}</div>
          </div>
          <div><label className="block mb-1.5 text-sm font-semibold text-gray-700"><FileText className="inline w-4 h-4 mr-1 text-primary-600"/>Productos / Descripción</label><textarea value={form.products} onChange={e=>set('products',e.target.value)} rows={2} maxLength={1000} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/></div>
          <div><label className="block mb-1.5 text-sm font-semibold text-gray-700">Observaciones</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} maxLength={1000} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/></div>
          <div><label className="block mb-1.5 text-sm font-semibold text-gray-700"><Paperclip className="inline w-4 h-4 mr-1 text-primary-600"/>Adjunto (opcional)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>set('attachment',e.target.files?.[0]||null)} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700"/></div>
          {isEdit&&(<div><label className="block mb-1.5 text-sm font-semibold text-gray-700">Estado</label><select value={form.status} onChange={e=>set('status',e.target.value)} className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"><option value="scheduled">Agendada</option><option value="confirmed">Confirmada</option><option value="completed">Completada</option></select></div>)}
          {error&&(<div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50"><AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/><p className="text-sm text-red-700">{error}</p></div>)}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1">{isEdit?'Guardar cambios':'Agendar cita'}</Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailModal=({appointment,onClose,onEdit})=>{
  const queryClient=useQueryClient();
  const [showCancelForm,setShowCancelForm]=useState(false);
  const [cancelReason,setCancelReason]=useState('');
  const cancelMutation=useMutation({
    mutationFn:()=>appointmentService.cancel(appointment.id,cancelReason),
    onSuccess:()=>{queryClient.invalidateQueries(['appointments']);showToast.success('Cita cancelada');onClose();},
    onError:()=>showToast.error('Error al cancelar'),
  });
  const cfg=STATUS_CONFIG[appointment.status]||STATUS_CONFIG.scheduled;
  const StatusIcon=cfg.icon;
  const missingDocs=(appointment.physical_docs_status||[]).filter(d=>d.missing&&d.required);

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${typeColor(appointment.type)}`}/>
            <h2 className="font-bold text-gray-900">{appointment.type_label}</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}><StatusIcon className="w-3 h-3"/>{cfg.label}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-200"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100"><p className="text-xs font-semibold text-blue-600 mb-1">Fecha</p><p className="text-sm font-bold text-blue-900 capitalize">{new Date(appointment.appointment_date+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p></div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100"><p className="text-xs font-semibold text-purple-600 mb-1">Hora</p><p className="text-sm font-bold text-purple-900">{appointment.appointment_time} hrs</p></div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"><Building2 className="w-5 h-5 text-gray-500 flex-shrink-0"/><div><p className="text-xs text-gray-500">Proveedor</p><p className="text-sm font-semibold text-gray-900">{appointment.provider?.business_name}</p><p className="text-xs text-gray-400 font-mono">{appointment.provider?.rfc}</p></div></div>

          {/* ✅ ALERTA DOCS FALTANTES — visible para Compras */}
          {appointment.has_missing_docs && missingDocs.length > 0 && (
            <div className="p-3 rounded-xl border-2 border-red-300 bg-red-50 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
                <p className="text-sm font-bold text-red-700">⚠️ Documentos físicos no presentados</p>
              </div>
              <p className="text-xs text-red-600">El proveedor no presentó los siguientes documentos al ingresar:</p>
              <ul className="space-y-1">
                {missingDocs.map((d,i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-red-700">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0"/>
                    {d.label}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-500 pt-1 border-t border-red-200">
                Confirmado por Seguridad · {appointment.entry_confirmed_at} hrs
              </p>
            </div>
          )}

          {/* Info entrada */}
          {appointment.is_entry_confirmed && (
            <div className={`p-3 rounded-xl border space-y-1.5 ${appointment.has_missing_docs ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs font-semibold text-gray-700">Registro de entrada</p>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5"/>Entró: {appointment.entry_confirmed_at} hrs
                </span>
                {appointment.actual_arrival_time && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${appointment.arrived_on_time ? 'text-green-700' : 'text-orange-700'}`}>
                    <Timer className="w-3.5 h-3.5"/>
                    {appointment.arrived_on_time ? 'A tiempo' : `Retraso: ${appointment.delay_minutes} min`}
                  </span>
                )}
              </div>
              {appointment.entry_notes && <p className="text-xs text-gray-500 italic">"{appointment.entry_notes}"</p>}
            </div>
          )}

          {appointment.is_completed_by_provider ? (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 space-y-1.5">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/>Proveedor completó su información</p>
              {appointment.vehicle_display&&(<div className="flex items-center gap-2"><Truck className="w-4 h-4 text-green-600"/><p className="text-sm text-green-800">{appointment.vehicle_display}</p></div>)}
              {appointment.driver_display&&(<div className="flex items-center gap-2"><User className="w-4 h-4 text-green-600"/><p className="text-sm text-green-800">{appointment.driver_display}</p></div>)}
              {appointment.provider_notes&&(<p className="text-sm text-green-700 italic border-t border-green-200 pt-1">"{appointment.provider_notes}"</p>)}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200"><Clock className="w-4 h-4 text-amber-500"/><p className="text-xs text-amber-700">Esperando que el proveedor complete vehículo y chofer</p></div>
          )}

          {appointment.products&&(<div className="p-3 rounded-xl bg-gray-50 border border-gray-200"><p className="text-xs text-gray-500 mb-1">Productos</p><p className="text-sm text-gray-800">{appointment.products}</p></div>)}
          {appointment.notes&&(<div className="p-3 rounded-xl bg-amber-50 border border-amber-200"><p className="text-xs text-amber-600 mb-1">Observaciones</p><p className="text-sm text-amber-900">{appointment.notes}</p></div>)}
          {appointment.has_attachment&&(<button onClick={()=>appointmentService.downloadAttachment(appointment.id,appointment.attachment_name)} className="flex items-center gap-2 w-full p-3 rounded-xl bg-primary-50 border border-primary-200 hover:bg-primary-100 text-left"><Paperclip className="w-4 h-4 text-primary-600"/><div className="flex-1 min-w-0"><p className="text-xs text-primary-600">Adjunto</p><p className="text-sm font-semibold text-primary-800 truncate">{appointment.attachment_name}</p></div><Download className="w-4 h-4 text-primary-600"/></button>)}
          {appointment.status==='cancelled'&&appointment.cancellation_reason&&(<div className="p-3 rounded-xl bg-red-50 border border-red-200"><p className="text-xs text-red-600 mb-1">Motivo cancelación</p><p className="text-sm text-red-800">{appointment.cancellation_reason}</p></div>)}
          {showCancelForm&&(<div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 space-y-3"><p className="text-sm font-semibold text-red-800">¿Motivo de cancelación?</p><textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none resize-none bg-white"/><div className="flex gap-2"><Button variant="danger" size="sm" loading={cancelMutation.isPending} onClick={()=>cancelMutation.mutate()}>Confirmar</Button><Button variant="ghost" size="sm" onClick={()=>setShowCancelForm(false)}>Volver</Button></div></div>)}
          {appointment.status!=='cancelled'&&appointment.status!=='completed'&&!showCancelForm&&(
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={()=>{onEdit(appointment);onClose();}} className="flex-1">Editar</Button>
              <Button variant="danger" size="sm" onClick={()=>setShowCancelForm(true)} className="flex-1">Cancelar cita</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AppointmentsPage=()=>{
  const [view,setView]=useState('month');
  const [currentDate,setCurrentDate]=useState(new Date());
  const [showModal,setShowModal]=useState(false);
  const [editAppointment,setEditAppointment]=useState(null);
  const [detailAppointment,setDetailAppointment]=useState(null);
  const [preselectedDate,setPreselectedDate]=useState('');
  const year=currentDate.getFullYear(); const month=currentDate.getMonth();
  const getWeekStart=(date)=>{const d=new Date(date);d.setDate(d.getDate()-d.getDay());return d;};
  const [weekStart,setWeekStart]=useState(()=>getWeekStart(new Date()));
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const {data,isLoading}=useQuery({queryKey:['appointments',year,month+1],queryFn:()=>appointmentService.getAll({year,month:month+1}),keepPreviousData:true});
  const appointments=data?.appointments||[];
  const byDate=useMemo(()=>{const map={};appointments.forEach(a=>{if(!map[a.appointment_date])map[a.appointment_date]=[];map[a.appointment_date].push(a);});return map;},[appointments]);
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const calendarCells=Array.from({length:firstDay+daysInMonth},(_,i)=>i<firstDay?null:i-firstDay+1);
  const navigateCal=(dir)=>{if(view==='month'){setCurrentDate(d=>new Date(d.getFullYear(),d.getMonth()+dir,1));}else{const d=new Date(weekStart);d.setDate(d.getDate()+dir*7);setWeekStart(d);}};
  const todayStr=new Date().toISOString().split('T')[0];
  const fmt=(d)=>d.toISOString().split('T')[0];
  const openCreate=(dateStr='')=>{setPreselectedDate(dateStr);setEditAppointment(null);setShowModal(true);};

  return(
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><Calendar className="w-6 h-6 text-white"/></div>
          <div><h1 className="text-3xl font-bold text-gray-900">Calendario de Citas</h1><p className="text-sm text-gray-600">Agenda y gestiona las visitas de proveedores</p></div>
        </div>
        <Button onClick={()=>openCreate()} leftIcon={<Plus className="w-4 h-4"/>}>Nueva Cita</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[{label:'Este mes',value:appointments.length,color:'blue'},{label:'Agendadas',value:appointments.filter(a=>a.status==='scheduled').length,color:'purple'},{label:'Confirmadas',value:appointments.filter(a=>a.status==='confirmed').length,color:'green'},{label:'Docs faltantes',value:appointments.filter(a=>a.has_missing_docs).length,color:'red'}].map(s=>(
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}><p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p><p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p></div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigateCal(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[200px] text-center">{view==='month'?`${MONTHS[month]} ${year}`:`${weekDays[0].toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — ${weekDays[6].toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`}</h2>
          <button onClick={()=>navigateCal(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
          <button onClick={()=>{setCurrentDate(new Date());setWeekStart(getWeekStart(new Date()));}} className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100">Hoy</button>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">{[['month','Mes',LayoutGrid],['week','Semana',List]].map(([val,label,Icon])=>(<button key={val} onClick={()=>setView(val)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${view===val?'bg-white text-primary-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}><Icon className="w-4 h-4"/>{label}</button>))}</div>
      </div>

      {view==='month'&&(
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">{DAYS.map(d=>(<div key={d} className="py-3 text-xs font-bold text-center text-gray-500 uppercase tracking-wide">{d}</div>))}</div>
          {isLoading?(<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-t-primary-600 rounded-full animate-spin"/></div>):(
            <div className="grid grid-cols-7">
              {calendarCells.map((day,idx)=>{
                if(!day) return <div key={`e-${idx}`} className="h-28 bg-gray-50 border-b border-r border-gray-100"/>;
                const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayAppts=byDate[dateStr]||[];
                const isToday=dateStr===todayStr; const isPast=dateStr<todayStr;
                const hasMissingAny=dayAppts.some(a=>a.has_missing_docs);
                return(
                  <div key={dateStr} className={`h-28 p-1.5 border-b border-r border-gray-100 cursor-pointer group transition-colors ${isToday?'bg-primary-50':isPast?'bg-gray-50/50':'bg-white hover:bg-blue-50/40'}`} onClick={()=>!isPast&&openCreate(dateStr)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday?'bg-primary-600 text-white':isPast?'text-gray-400':'text-gray-700 group-hover:bg-primary-100 group-hover:text-primary-700'}`}>{day}</span>
                      <div className="flex items-center gap-1">
                        {hasMissingAny&&<span className="w-2 h-2 rounded-full bg-red-500" title="Docs faltantes"/>}
                        {dayAppts.length>0&&<span className="text-xs font-bold text-gray-400">{dayAppts.length}</span>}
                      </div>
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayAppts.slice(0,3).map(a=>(
                        <div key={a.id} onClick={e=>{e.stopPropagation();setDetailAppointment(a);}}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate cursor-pointer hover:opacity-80 ${typeColor(a.type)} ${a.status==='cancelled'?'opacity-40 line-through':''}`}>
                          <span>{a.appointment_time?.slice(0,5)}</span>
                          <span className="truncate">{a.provider?.business_name}</span>
                          {a.has_missing_docs&&<span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" title="Docs faltantes"/>}
                          {!a.is_completed_by_provider&&a.status!=='cancelled'&&!a.has_missing_docs&&<span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" title="Pendiente info proveedor"/>}
                        </div>
                      ))}
                      {dayAppts.length>3&&<p className="text-xs text-gray-400 text-center">+{dayAppts.length-3} más</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view==='week'&&(
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-8 border-b border-gray-200"><div className="py-3 border-r border-gray-200"/>{weekDays.map((d,i)=>{const dateStr=fmt(d);const isToday=dateStr===todayStr;return(<div key={i} className={`py-3 text-center border-r border-gray-100 ${isToday?'bg-primary-50':''}`}><p className="text-xs font-semibold text-gray-500 uppercase">{DAYS[d.getDay()]}</p><p className={`text-lg font-bold mt-0.5 ${isToday?'text-primary-600':'text-gray-800'}`}>{d.getDate()}</p></div>);})}</div>
          <div className="overflow-y-auto max-h-[600px]">
            {HOURS.map(hour=>(<div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[56px]"><div className="px-3 py-2 text-xs font-semibold text-gray-400 border-r border-gray-200 flex items-start pt-2">{hour}</div>{weekDays.map((d,i)=>{const dateStr=fmt(d);const isToday=dateStr===todayStr;const hourAppts=(byDate[dateStr]||[]).filter(a=>a.appointment_time?.startsWith(hour.slice(0,2)));return(<div key={i} onClick={()=>openCreate(dateStr)} className={`p-1 border-r border-gray-100 cursor-pointer hover:bg-blue-50/40 ${isToday?'bg-primary-50/30':''}`}>{hourAppts.map(a=>(<div key={a.id} onClick={e=>{e.stopPropagation();setDetailAppointment(a);}} className={`px-2 py-1 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-80 mb-1 ${typeColor(a.type)} ${a.status==='cancelled'?'opacity-40':''}`}><p className="font-bold">{a.appointment_time?.slice(0,5)}</p><p className="truncate">{a.provider?.business_name}</p>{a.has_missing_docs&&<p className="text-red-200 text-xs">⚠ Docs</p>}</div>))}</div>);})}</div>))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
        {TYPE_OPTIONS.map(t=>(<span key={t.value} className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><span className={`w-3 h-3 rounded-full ${t.color}`}/>{t.label}</span>))}
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 ml-4"><span className="w-2 h-2 rounded-full bg-red-500"/>Docs faltantes</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Pendiente info proveedor</span>
      </div>

      {showModal&&(<AppointmentModal appointment={editAppointment} preselectedDate={preselectedDate} onClose={()=>{setShowModal(false);setEditAppointment(null);}}/>)}
      {detailAppointment&&(<DetailModal appointment={detailAppointment} onClose={()=>setDetailAppointment(null)} onEdit={(a)=>{setEditAppointment(a);setShowModal(true);setDetailAppointment(null);}}/>)}
    </div>
  );
};
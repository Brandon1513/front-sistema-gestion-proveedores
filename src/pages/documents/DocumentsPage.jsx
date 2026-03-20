import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { providerService } from '../../api/providerService';
import { documentService } from '../../api/documentService';
import { certificationService } from '../../api/certificationService';
import { useAuthStore } from '../../stores/authStore';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ValidationModal } from '../../components/documents/ValidationModal';
import { ValidationHistoryModal } from '../../components/providers/ValidationHistoryModal';
import { showToast } from '../../utils/toast';
import {
  FileText, Search, Download, Eye, History,
  CheckCircle, Clock, AlertTriangle, XCircle,
  Building2, ChevronDown, ChevronRight, ClipboardCheck, X,
  Award, Loader2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  approved: { label: 'Aprobado',  variant: 'active',   Icon: CheckCircle  },
  pending:  { label: 'Revisión',  variant: 'pending',  Icon: Clock        },
  rejected: { label: 'Rechazado', variant: 'rejected', Icon: XCircle      },
  expired:  { label: 'Vencido',   variant: 'expired',  Icon: AlertTriangle },
};

const CERT_STATUS = {
  pending:  { label: 'En Revisión', bg: 'bg-yellow-100 text-yellow-800', Icon: Clock        },
  approved: { label: 'Aprobada',    bg: 'bg-green-100 text-green-800',   Icon: CheckCircle  },
  rejected: { label: 'Rechazada',   bg: 'bg-red-100 text-red-800',       Icon: XCircle      },
};

const getDaysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const formatDate  = (d) => {
  if (!d) return '—';
  const [y,m,day] = d.split('T')[0].split('-');
  return new Date(y,m-1,day).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
};

// ─── Fila de documento ────────────────────────────────────────────────────────
const DocumentRow = ({ doc, providerId, highlighted, onValidate, onHistory, onDownload, onPreview }) => {
  const cfg        = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
  const daysLeft   = getDaysLeft(doc.expiry_date);
  const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
  const isExpired  = daysLeft !== null && daysLeft < 0;
  const canPreview = ['pdf','jpg','jpeg','png'].includes((doc.file_extension||'').toLowerCase());
  return (
    <tr className={`transition-colors ${highlighted?'bg-amber-50 border-l-4 border-l-amber-400':'hover:bg-gray-50'}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-primary"><FileText className="w-4 h-4 text-white"/></div>
          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{doc.document_type?.name||doc.file_name||'—'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          ${cfg.variant==='active'  ?'bg-green-100 text-green-800':''}
          ${cfg.variant==='pending' ?'bg-yellow-100 text-yellow-800':''}
          ${cfg.variant==='rejected'?'bg-red-100 text-red-800':''}
          ${cfg.variant==='expired' ?'bg-red-100 text-red-800':''}
        `}><cfg.Icon className="w-3 h-3"/>{cfg.label}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3">
        {doc.expiry_date ? (
          <div>
            <p className={`text-sm font-medium ${isExpired?'text-red-600':isExpiring?'text-amber-600':'text-gray-700'}`}>{formatDate(doc.expiry_date)}</p>
            {daysLeft!==null && <p className={`text-xs ${isExpired?'text-red-500':isExpiring?'text-amber-500':'text-gray-400'}`}>{isExpired?`Vencido hace ${Math.abs(daysLeft)} días`:`${daysLeft} días restantes`}</p>}
          </div>
        ) : <span className="text-xs text-gray-400">Sin vencimiento</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={()=>onHistory(doc.id)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Historial"><History className="w-4 h-4"/></button>
          {canPreview && <button onClick={()=>onPreview(providerId,doc.id)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50" title="Ver"><Eye className="w-4 h-4"/></button>}
          <button onClick={()=>onDownload(providerId,doc.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Descargar"><Download className="w-4 h-4"/></button>
          {doc.status==='pending' && <button onClick={()=>onValidate({...doc,provider_id:providerId})} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700">Validar</button>}
        </div>
      </td>
    </tr>
  );
};

// ─── Bloque proveedor (documentos) ───────────────────────────────────────────
const ProviderBlock = ({ provider, highlightDocId, onValidate, onHistory, onDownload, onPreview, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen||false);
  const { data, isLoading } = useQuery({
    queryKey: ['provider-documents', provider.id],
    queryFn: () => documentService.getByProvider(provider.id),
    enabled: open,
  });
  const docs = data?.documents||[];
  const pendingCount  = docs.filter(d=>d.status==='pending').length;
  const expiringCount = docs.filter(d=>{const dl=getDaysLeft(d.expiry_date);return dl!==null&&dl<=30&&dl>=0;}).length;
  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all duration-200 ${open?'border-primary-200 shadow-sm':'border-gray-200 hover:border-gray-300'}`}>
      <button onClick={()=>setOpen(!open)} className="flex items-center justify-between w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg shadow-sm bg-gradient-primary"><Building2 className="w-5 h-5 text-white"/></div>
          <div><p className="font-bold text-gray-900">{provider.business_name}</p><p className="font-mono text-xs text-gray-500">{provider.rfc} · {provider.provider_type?.name||'—'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount>0  && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">{pendingCount} pendiente{pendingCount>1?'s':''}</span>}
          {expiringCount>0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{expiringCount} por vencer</span>}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
            ${provider.status==='active'  ?'bg-green-100 text-green-700':''}
            ${provider.status==='pending' ?'bg-yellow-100 text-yellow-700':''}
            ${provider.status==='inactive'?'bg-gray-100 text-gray-700':''}
            ${provider.status==='rejected'?'bg-red-100 text-red-700':''}
          `}>{provider.status==='active'?'Activo':provider.status==='pending'?'Pendiente':provider.status==='inactive'?'Inactivo':'Rechazado'}</span>
          {open?<ChevronDown className="w-4 h-4 text-gray-400"/>:<ChevronRight className="w-4 h-4 text-gray-400"/>}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100">
          {isLoading ? <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"/></div>
          : docs.length===0 ? <div className="py-8 text-sm text-center text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-300"/>Sin documentos cargados</div>
          : <div className="overflow-x-auto"><table className="min-w-full">
              <thead className="bg-gray-50"><tr>{['Documento','Estado','Cargado','Vencimiento','Acciones'].map(h=><th key={h} className="px-4 py-2 text-xs font-semibold text-left text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(doc=><DocumentRow key={doc.id} doc={doc} providerId={provider.id} highlighted={String(doc.id)===String(highlightDocId)} onValidate={onValidate} onHistory={onHistory} onDownload={onDownload} onPreview={onPreview}/>)}
              </tbody>
            </table></div>}
        </div>
      )}
    </div>
  );
};

// ─── Modal de validación de certificación ────────────────────────────────────
const CertValidationModal = ({ isOpen, onClose, certification }) => {
  const queryClient = useQueryClient();
  const [action, setAction]     = useState(null);
  const [comments, setComments] = useState('');
  const [error, setError]       = useState('');
  const [downloading, setDownloading] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ status, comments }) =>
      certificationService.validate(certification.provider_id, certification.id, { status, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-certifications']);
      showToast.success(action === 'approve' ? 'Certificación aprobada' : 'Certificación rechazada');
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al validar'),
  });

  const handleSubmit = () => {
    if (!action) { setError('Selecciona una acción'); return; }
    if (action === 'reject' && !comments.trim()) { setError('El motivo de rechazo es obligatorio'); return; }
    mutation.mutate({ status: action === 'approve' ? 'approved' : 'rejected', comments: comments.trim() || null });
  };

  const handleDownload = async () => {
    if (!certification?.file_name) return;
    setDownloading(true);
    try { await certificationService.download(certification.provider_id, certification.id, certification.file_name); }
    catch { showToast.error('Error al descargar'); }
    finally { setDownloading(false); }
  };

  if (!certification) return null;
  const certName = certification.certification_type === 'Otro' ? certification.other_name : certification.certification_type;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg"
      title={<div className="flex items-center gap-3"><div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary shadow-md"><Award className="w-5 h-5 text-white"/></div><div><p className="font-bold text-gray-900">Validar Certificación</p><p className="text-xs text-gray-500">{certName}</p></div></div>}
      footer={<><Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button onClick={handleSubmit} loading={mutation.isPending} disabled={!action||(action==='reject'&&!comments.trim())} variant={action==='approve'?'success':action==='reject'?'danger':'primary'} leftIcon={action==='approve'?<CheckCircle className="w-4 h-4"/>:action==='reject'?<XCircle className="w-4 h-4"/>:null}>{action==='approve'?'Aprobar Certificación':action==='reject'?'Rechazar Certificación':'Selecciona una acción'}</Button></>}
    >
      <div className="space-y-5">
        {/* Info proveedor */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-md"><Building2 className="w-6 h-6 text-white"/></div>
            <div>
              <p className="font-bold text-gray-900">{certification.provider?.business_name}</p>
              <p className="text-sm text-gray-600 font-mono">{certification.provider?.rfc}</p>
            </div>
          </div>
        </div>

        {/* Info certificación */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Tipo</p><p className="font-medium text-gray-900">{certName}</p></div>
            {certification.certification_number && <div><p className="text-xs text-gray-500 uppercase font-semibold">Número</p><p className="font-mono text-gray-900">#{certification.certification_number}</p></div>}
            {certification.certifying_body && <div><p className="text-xs text-gray-500 uppercase font-semibold">Organismo</p><p className="text-gray-900">{certification.certifying_body}</p></div>}
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Vencimiento</p><p className="text-gray-900">{formatDate(certification.expiry_date)}</p></div>
          </div>
          {/* Archivo */}
          {certification.file_name && (
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 w-full mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
              {downloading ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin"/> : <Download className="w-4 h-4 text-blue-600"/>}
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-blue-700">{certification.file_name}</p>
                {certification.file_size_kb && <p className="text-xs text-blue-500">{certification.file_size_kb} KB</p>}
              </div>
            </button>
          )}
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={()=>setAction('approve')} className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${action==='approve'?'border-green-500 bg-green-50':'border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
            <CheckCircle className={`w-7 h-7 mb-1 ${action==='approve'?'text-green-600':'text-gray-400'}`}/>
            <span className={`font-bold text-sm ${action==='approve'?'text-green-700':'text-gray-600'}`}>Aprobar</span>
            {action==='approve' && <span className="text-xs text-green-500 mt-0.5">✓ Seleccionado</span>}
          </button>
          <button onClick={()=>setAction('reject')} className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${action==='reject'?'border-red-500 bg-red-50':'border-gray-200 hover:border-red-300 hover:bg-red-50'}`}>
            <XCircle className={`w-7 h-7 mb-1 ${action==='reject'?'text-red-600':'text-gray-400'}`}/>
            <span className={`font-bold text-sm ${action==='reject'?'text-red-700':'text-gray-600'}`}>Rechazar</span>
            {action==='reject' && <span className="text-xs text-red-500 mt-0.5">✓ Seleccionado</span>}
          </button>
        </div>

        {/* Comentarios */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            Comentarios {action==='reject' && <span className="text-red-500">*</span>}
          </label>
          <textarea value={comments} onChange={e=>setComments(e.target.value)} rows={3}
            placeholder={action==='reject'?'Motivo del rechazo (obligatorio)...':'Observaciones opcionales...'}
            className={`w-full px-4 py-3 border-2 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all
              ${action==='reject'&&!comments.trim()?'border-red-300 focus:border-red-400':'border-gray-200 focus:border-primary'}`}/>
        </div>

        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200"><AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0"/><p className="text-sm text-red-700">{error}</p></div>}
      </div>
    </Modal>
  );
};

// ─── Tab Certificaciones ──────────────────────────────────────────────────────
const CertStatusBadge = ({ expiryDate }) => {
  const days = getDaysLeft(expiryDate);
  if (!expiryDate) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Sin fecha</span>;
  if (days<0)    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">🔴 Vencida</span>;
  if (days<=30)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">⚠ {days}d</span>;
  if (days<=90)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">📅 {days}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">✓ Vigente</span>;
};

const CertificationsTab = ({ canValidate }) => {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [showValidModal, setShowValidModal] = useState(false);
  const [downloadingId, setDownloadingId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['all-certifications', { search, typeFilter, statusFilter }],
    queryFn: () => certificationService.getAll({
      search: search||undefined,
      provider_type_id: typeFilter||undefined,
      status: statusFilter||undefined,
    }),
  });

  const allCerts = data?.certifications || [];
  const stats    = data?.stats || {};

  const certs = allCerts.filter(c => {
    const d = getDaysLeft(c.expiry_date);
    if (statusFilter==='expired')  return d!==null && d<0;
    if (statusFilter==='expiring') return d!==null && d>=0 && d<=90;
    if (statusFilter==='valid')    return !c.expiry_date||(d!==null&&d>90);
    return true;
  });

  const expired  = allCerts.filter(c=>{const d=getDaysLeft(c.expiry_date);return d!==null&&d<0;}).length;
  const expiring = allCerts.filter(c=>{const d=getDaysLeft(c.expiry_date);return d!==null&&d>=0&&d<=90;}).length;
  const valid    = allCerts.filter(c=>{const d=getDaysLeft(c.expiry_date);return !c.expiry_date||(d!==null&&d>90);}).length;

  const handleDownload = async (cert) => {
    if (!cert.file_name) { showToast.error('Sin archivo adjunto'); return; }
    setDownloadingId(cert.id);
    try { await certificationService.download(cert.provider_id, cert.id, cert.file_name); }
    catch { showToast.error('Error al descargar'); }
    finally { setDownloadingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {canValidate && stats.pending > 0 && (
          <button onClick={()=>setStatusFilter(statusFilter==='pending'?'':'pending')}
            className={`p-4 rounded-xl bg-white border-2 text-center hover:shadow-sm transition-all col-span-2 sm:col-span-1
              ${statusFilter==='pending'?'border-yellow-300 ring-2 ring-yellow-200':'border-yellow-200'}`}>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pendientes revisión</p>
          </button>
        )}
        {[{label:'Vigentes',value:valid,color:'border-green-200 text-green-600',filter:'valid'},{label:'Por vencer',value:expiring,color:'border-amber-200 text-amber-600',filter:'expiring'},{label:'Vencidas',value:expired,color:'border-red-200 text-red-600',filter:'expired'}].map(s=>(
          <button key={s.label} onClick={()=>setStatusFilter(statusFilter===s.filter?'':s.filter)}
            className={`p-4 rounded-xl bg-white border-2 text-center hover:shadow-sm transition-all ${statusFilter===s.filter?s.color+' ring-2 ring-offset-1':'border-gray-200'}`}>
            <p className={`text-2xl font-bold ${statusFilter===s.filter?s.color.split(' ')[1]:'text-gray-700'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="Buscar proveedor o certificación..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Todos los tipos</option>
          <option value="1">MP y ME</option><option value="2">Residuos</option><option value="3">Laboratorios</option>
          <option value="4">Sustancias Químicas</option><option value="5">Insumos Generales</option>
        </select>
        {(search||typeFilter||statusFilter) && <button onClick={()=>{setSearch('');setTypeFilter('');setStatusFilter('');}} className="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap">Limpiar</button>}
      </div>

      {/* Tabla */}
      {isLoading ? <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"/></div>
      : certs.length===0 ? (
        <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-600">No se encontraron certificaciones</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>{['Certificación','Proveedor','Organismo','Estado','Emisión','Vencimiento','Acciones'].map(h=><th key={h} className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {certs.map(cert=>{
                const certStatusCfg = CERT_STATUS[cert.status]||CERT_STATUS.pending;
                const CertIcon      = certStatusCfg.Icon;
                const days=getDaysLeft(cert.expiry_date);
                const isExp=days!==null&&days<0;
                const isExpiring=days!==null&&days>=0&&days<=30;
                return (
                  <tr key={cert.id} className={`hover:bg-gray-50 transition-colors ${isExp?'bg-red-50':isExpiring?'bg-amber-50':''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${isExp?'bg-red-100':isExpiring?'bg-amber-100':'bg-amber-50'}`}>
                          <Award className={`w-4 h-4 ${isExp?'text-red-500':'text-amber-500'}`}/>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{cert.certification_type==='Otro'?cert.other_name:cert.certification_type}</p>
                          {cert.certificate_number&&<p className="text-xs text-gray-400 font-mono">#{cert.certificate_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={()=>navigate(`/providers/${cert.provider_id}`)} className="text-left group">
                        <p className="text-sm font-semibold text-primary-600 group-hover:underline truncate max-w-[140px]">{cert.provider?.business_name||'—'}</p>
                        <p className="text-xs text-gray-400">{cert.provider?.provider_type?.name||'—'}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cert.certifying_body||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${certStatusCfg.bg}`}>
                        <CertIcon className="w-3 h-3"/>{certStatusCfg.label}
                      </span>
                      {cert.status==='rejected'&&cert.validation_comments&&(
                        <p className="text-xs text-red-500 mt-1 italic truncate max-w-[120px]" title={cert.validation_comments}>"{cert.validation_comments}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(cert.issue_date)}</td>
                    <td className="px-4 py-3">
                      {cert.expiry_date ? (
                        <div>
                          <p className={`text-sm font-medium ${isExp?'text-red-600':isExpiring?'text-amber-600':'text-gray-700'}`}>{formatDate(cert.expiry_date)}</p>
                          {days!==null&&<p className={`text-xs ${isExp?'text-red-500':isExpiring?'text-amber-500':'text-gray-400'}`}>{isExp?`Vencida hace ${Math.abs(days)} días`:`${days} días restantes`}</p>}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Descargar archivo */}
                        {cert.file_name && (
                          <button onClick={()=>handleDownload(cert)} disabled={downloadingId===cert.id}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50" title="Descargar certificado">
                            {downloadingId===cert.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Download className="w-4 h-4"/>}
                          </button>
                        )}
                        {/* Validar — solo Calidad/Admin y solo si está pending */}
                        {canValidate && cert.status==='pending' && (
                          <button onClick={()=>{setSelectedCert(cert);setShowValidModal(true);}}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                            Validar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal validación */}
      {showValidModal && selectedCert && (
        <CertValidationModal
          isOpen={showValidModal}
          onClose={()=>{setShowValidModal(false);setSelectedCert(null);}}
          certification={selectedCert}
        />
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const DocumentsPage = () => {
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const userRole    = user?.roles?.[0]?.name||user?.roles?.[0]||user?.role||'';
  const canValidate = ['super_admin','admin','calidad'].includes(userRole);

  const [searchParams, setSearchParams] = useSearchParams();
  const highlightProvider = searchParams.get('provider');
  const highlightDoc      = searchParams.get('doc');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab')==='certifications'?'certifications':'documents');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [selectedDoc, setSelectedDoc]   = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [historyDocId, setHistoryDocId]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['providers-for-docs',{search,status:statusFilter,type:typeFilter}],
    queryFn: () => providerService.getAll({search:search||undefined,status:statusFilter||undefined,provider_type_id:typeFilter||undefined,per_page:100}),
  });
  const providers = data?.data||[];

  const handleDownload = async (pId,dId) => {
    try{await documentService.download(pId,dId);showToast.success('Documento descargado');}
    catch{showToast.error('Error al descargar');}
  };
  const handlePreview   = (pId,dId) => window.open(documentService.getViewUrl(pId,dId),'_blank','noopener,noreferrer');
  const clearFilters    = () => {setSearch('');setStatusFilter('');setTypeFilter('');setSearchParams({},{replace:true});};
  const hasFilters      = search||statusFilter||typeFilter||highlightProvider;
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(p=>{const n=new URLSearchParams(p);n.set('tab',tab);return n;},{replace:true});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary"><ClipboardCheck className="w-6 h-6 text-white"/></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
            <p className="text-sm text-gray-600">Consulta y gestiona documentos y certificaciones de proveedores</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200">
        {[{id:'documents',label:'Documentos',icon:FileText},{id:'certifications',label:'Certificaciones',icon:Award}].map(tab=>{
          const Icon=tab.icon;
          return (
            <button key={tab.id} onClick={()=>handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200
                ${activeTab===tab.id?'border-primary-500 text-primary-600 bg-primary-50':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4"/>{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Certificaciones */}
      {activeTab==='certifications' && <CertificationsTab canValidate={canValidate}/>}

      {/* Tab Documentos */}
      {activeTab==='documents' && (
        <>
          {highlightProvider && (
            <div className="flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2"><AlertTriangle className="flex-shrink-0 w-4 h-4 text-amber-600"/><p className="text-sm font-medium text-amber-800">Mostrando proveedor con documento próximo a vencer</p></div>
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold underline text-amber-600 hover:text-amber-800"><X className="w-3 h-3"/>Limpiar</button>
            </div>
          )}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
                <input type="text" placeholder="Buscar proveedor..." value={search} onChange={e=>setSearch(e.target.value)}
                  className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
              </div>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Todos los estados</option><option value="active">Activos</option><option value="pending">Pendientes</option><option value="inactive">Inactivos</option>
              </select>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Todos los tipos</option><option value="1">MP y ME</option><option value="2">Residuos</option><option value="3">Laboratorios</option><option value="4">Sustancias Químicas</option><option value="5">Insumos Generales</option>
              </select>
              {hasFilters&&<button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"><X className="w-4 h-4"/>Limpiar</button>}
            </div>
          </div>
          {isLoading ? <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"/></div>
          : providers.length===0 ? <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl"><Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300"/><p className="font-medium text-gray-700">No se encontraron proveedores</p>{hasFilters&&<button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">Limpiar filtros</button>}</div>
          : <div className="space-y-3">{providers.map(provider=><ProviderBlock key={provider.id} provider={provider} highlightDocId={String(provider.id)===String(highlightProvider)?highlightDoc:null} defaultOpen={String(provider.id)===String(highlightProvider)} onValidate={doc=>{setSelectedDoc(doc);setShowValidation(true);}} onHistory={docId=>setHistoryDocId(docId)} onDownload={handleDownload} onPreview={handlePreview}/>)}</div>}
        </>
      )}

      <ValidationModal isOpen={showValidation} onClose={()=>{setShowValidation(false);setSelectedDoc(null);}} document={selectedDoc}/>
      {historyDocId&&<ValidationHistoryModal documentId={historyDocId} onClose={()=>setHistoryDocId(null)}/>}
    </div>
  );
};
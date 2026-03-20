import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerCertificationService } from '../../api/providerCertificationService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Award, Plus, Edit2, Trash2, Calendar, FileText,
  AlertCircle, CheckCircle, Clock, XCircle, Upload,
  Download, Lock, X, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { label: 'En Revisión', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', Icon: Clock        },
  approved: { label: 'Aprobada',    bg: 'bg-green-100 text-green-800 border-green-300',    Icon: CheckCircle  },
  rejected: { label: 'Rechazada',   bg: 'bg-red-100 text-red-800 border-red-300',          Icon: XCircle      },
};

const formatDate = (d) => {
  if (!d) return 'N/A';
  const [y, m, day] = d.split('T')[0].split('-');
  return new Date(y, m-1, day).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
};

const getDaysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

const getExpiryBadge = (expiryDate) => {
  const days = getDaysLeft(expiryDate);
  if (days === null) return { variant: 'inactive', text: 'Sin fecha' };
  if (days < 0)      return { variant: 'expired',  text: '🔴 Vencida'       };
  if (days <= 30)    return { variant: 'alert',    text: `⚠️ ${days} días`  };
  if (days <= 60)    return { variant: 'warning',  text: `📅 ${days} días`  };
  return               { variant: 'active',   text: '✓ Vigente'              };
};

// ─── Modal de formulario ──────────────────────────────────────────────────────
const CERT_TYPES = ['ISO 9001', 'ISO 14001', 'ISO 22000', 'FSSC 22000', 'HACCP', 'KOSHER', 'HALAL', 'BRC', 'SQF', 'Otro'];

const CertFormModal = ({ isOpen, onClose, onSave, certification, loading }) => {
  const isEdit = !!certification;

  const [form, setForm] = useState({
    certification_type:   certification?.certification_type   || '',
    other_name:           certification?.other_name           || '',
    certification_number: certification?.certification_number || '',
    certifying_body:      certification?.certifying_body      || '',
    issue_date:           certification?.issue_date?.split('T')[0]  || '',
    expiry_date:          certification?.expiry_date?.split('T')[0] || '',
  });
  const [file, setFile]       = useState(null);
  const [dragActive, setDrag] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError('El archivo no debe superar los 10MB'); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) { setError('Solo se permiten PDF e imágenes (JPG, PNG)'); return; }
    setFile(f);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.certification_type)  { setError('Selecciona el tipo de certificación'); return; }
    if (!form.issue_date)          { setError('La fecha de emisión es requerida'); return; }
    if (!form.expiry_date)         { setError('La fecha de vencimiento es requerida'); return; }
    if (!isEdit && !file)          { setError('Debes adjuntar el archivo de la certificación'); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (file) fd.append('file', file);

    onSave(fd);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary shadow-md"><Award className="w-5 h-5 text-white"/></div>
          <div><p className="font-bold text-gray-900">{isEdit ? 'Editar Certificación' : 'Agregar Certificación'}</p><p className="text-xs text-gray-500">Completa los datos y adjunta el archivo</p></div>
        </div>
      }
      footer={
        <><Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="primary" loading={loading} onClick={handleSubmit}
          leftIcon={<Upload className="w-4 h-4"/>}>
          {isEdit ? 'Guardar cambios' : 'Enviar a revisión'}
        </Button></>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Tipo de Certificación <span className="text-red-500">*</span></label>
          <select name="certification_type" value={form.certification_type} onChange={handleChange}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm">
            <option value="">Selecciona un tipo</option>
            {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {form.certification_type === 'Otro' && (
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre de la certificación</label>
            <input type="text" name="other_name" value={form.other_name} onChange={handleChange} placeholder="Ej: KOSHER Plus"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"/>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Número de Certificado</label>
            <input type="text" name="certification_number" value={form.certification_number} onChange={handleChange} placeholder="Ej: 12345"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"/>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Organismo Certificador</label>
            <input type="text" name="certifying_body" value={form.certifying_body} onChange={handleChange} placeholder="Ej: SGS, Bureau Veritas"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"/>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Fecha de Emisión <span className="text-red-500">*</span></label>
            <input type="date" name="issue_date" value={form.issue_date} onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"/>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Fecha de Vencimiento <span className="text-red-500">*</span></label>
            <input type="date" name="expiry_date" value={form.expiry_date} onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"/>
          </div>
        </div>

        {/* Upload de archivo */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            Archivo del Certificado {!isEdit && <span className="text-red-500">*</span>}
            {isEdit && <span className="text-xs text-gray-400 font-normal ml-1">(deja vacío para conservar el actual)</span>}
          </label>
          <div
            onDragEnter={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={e=>{e.preventDefault();setDrag(false);}}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all
              ${dragActive ? 'border-primary bg-primary-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary-300'}`}
          >
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600"/>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{Math.round(file.size/1024)} KB</p>
                  </div>
                </div>
                <button type="button" onClick={e=>{e.stopPropagation();setFile(null);}} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4"/></button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400"/>
                <p className="text-sm text-gray-600">Arrastra el archivo o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG — máx. 10MB</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>
            Al {isEdit ? 'actualizar' : 'agregar'} la certificación, el Departamento de Calidad recibirá una notificación para revisarla.
          </p>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProviderCertificationsPage = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal]               = useState(false);
  const [editingCert, setEditingCert]           = useState(null);
  const [downloadingId, setDownloadingId]       = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-certifications'],
    queryFn: providerCertificationService.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: (fd) => editingCert
      ? providerCertificationService.update(editingCert.id, fd)
      : providerCertificationService.create(fd),
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-certifications']);
      setShowModal(false);
      setEditingCert(null);
      showToast.success(editingCert ? '✅ Certificación actualizada y enviada a revisión' : '🎉 Certificación enviada para revisión');
    },
    onError: (err) => showToast.error(err.response?.data?.message || 'Error al guardar certificación'),
  });

  const deleteMutation = useMutation({
    mutationFn: providerCertificationService.delete,
    onSuccess: () => { queryClient.invalidateQueries(['provider-certifications']); showToast.success('🗑️ Certificación eliminada'); },
    onError: (err) => showToast.error(err.response?.data?.message || 'Error al eliminar'),
  });

  const handleDelete = (cert) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">¿Eliminar <span className="text-primary-600">"{cert.certification_type}"</span>?</p>
        <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={()=>toast.dismiss(t.id)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={()=>{deleteMutation.mutate(cert.id);toast.dismiss(t.id);}}>Eliminar</Button>
        </div>
      </div>
    ), { duration:Infinity, position:'top-center', style:{maxWidth:'450px',padding:'20px',borderRadius:'16px',border:'2px solid #E5E7EB'} });
  };

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      const response = await providerCertificationService.download(cert.id);
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', cert.file_name || `certificacion_${cert.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast.error('Error al descargar archivo'); }
    finally { setDownloadingId(null); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"/>
        <p className="text-gray-600">Cargando certificaciones...</p>
      </div>
    </div>
  );

  const certifications = data?.certifications || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-primary shadow-md"><Award className="w-6 h-6 text-white"/></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Certificaciones</h1>
              <p className="text-sm text-gray-600">Gestiona tus certificaciones — requieren revisión de Calidad</p>
            </div>
          </div>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4"/>} onClick={()=>{setEditingCert(null);setShowModal(true);}}>
            Agregar Certificación
          </Button>
        </div>
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent-100 to-accent-200 mb-4"><Award className="w-10 h-10 text-accent-600"/></div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No hay certificaciones registradas</h3>
          <p className="text-gray-600 mb-6">Agrega tus certificaciones (ISO, HACCP, FSSC, etc.)</p>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4"/>} onClick={()=>{setEditingCert(null);setShowModal(true);}}>
            Agregar Primera Certificación
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certifications.map(cert => {
            const statusCfg   = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending;
            const expiryBadge = getExpiryBadge(cert.expiry_date);
            const canEdit     = cert.is_editable_by_provider !== false && cert.status === 'pending';
            const StatusIcon  = statusCfg.Icon;

            return (
              <div key={cert.id} className={`p-6 rounded-xl bg-white border-2 transition-all duration-200 hover:shadow-lg
                ${cert.status==='rejected' ? 'border-red-200' : cert.status==='approved' ? 'border-green-200' : 'border-gray-200 hover:border-primary-200'}`}>

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg shadow-md
                      ${cert.status==='approved' ? 'bg-gradient-to-br from-green-500 to-green-600' : cert.status==='rejected' ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-gradient-to-br from-accent-500 to-accent-600'}`}>
                      <Award className="w-6 h-6 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{cert.certification_type === 'Otro' ? cert.other_name : cert.certification_type}</h3>
                      {cert.certification_number && <p className="text-xs text-gray-400 font-mono">#{cert.certification_number}</p>}
                    </div>
                  </div>
                  {/* Badge de vencimiento */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                    <StatusIcon className="w-3 h-3 mr-1"/>{statusCfg.label}
                  </span>
                </div>

                {/* Comentario de rechazo */}
                {cert.status === 'rejected' && cert.validation_comments && (
                  <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-1">Motivo del rechazo:</p>
                    <p className="text-xs text-red-600 italic">"{cert.validation_comments}"</p>
                  </div>
                )}

                {/* Info */}
                <div className="space-y-2 mb-4">
                  {cert.certifying_body && (
                    <div className="p-2.5 rounded-lg bg-primary-50 border border-primary-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Organismo</p>
                      <p className="text-sm font-semibold text-gray-900">{cert.certifying_body}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3"/>Emisión</p>
                      <p className="text-sm font-bold text-gray-900">{formatDate(cert.issue_date)}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${expiryBadge.variant === 'expired' ? 'bg-red-50 border-red-200' : expiryBadge.variant === 'alert' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Vence</p>
                      <p className={`text-sm font-bold ${expiryBadge.variant === 'expired' ? 'text-red-600' : expiryBadge.variant === 'alert' ? 'text-amber-600' : 'text-gray-900'}`}>{formatDate(cert.expiry_date)}</p>
                    </div>
                  </div>
                  {/* Archivo adjunto */}
                  {cert.file_name && (
                    <button onClick={()=>handleDownload(cert)} disabled={downloadingId===cert.id}
                      className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                      {downloadingId===cert.id ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0"/> : <Download className="w-4 h-4 text-blue-600 flex-shrink-0"/>}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-semibold text-blue-700 truncate">{cert.file_name}</p>
                        {cert.file_size_kb && <p className="text-xs text-blue-500">{cert.file_size_kb} KB</p>}
                      </div>
                    </button>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-4 border-t-2 border-gray-100">
                  {canEdit ? (
                    <>
                      <Button variant="secondary" size="sm" leftIcon={<Edit2 className="w-4 h-4"/>}
                        onClick={()=>{setEditingCert(cert);setShowModal(true);}} className="flex-1">
                        Editar
                      </Button>
                      <button onClick={()=>handleDelete(cert)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                      <Lock className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                      <p className="text-xs text-gray-500">
                        {cert.status === 'approved'
                          ? 'Certificación aprobada — no se puede modificar'
                          : 'Certificación revisada por Calidad — no se puede modificar'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CertFormModal
        isOpen={showModal}
        onClose={()=>{setShowModal(false);setEditingCert(null);}}
        onSave={(fd)=>saveMutation.mutate(fd)}
        certification={editingCert}
        loading={saveMutation.isPending}
      />
    </div>
  );
};
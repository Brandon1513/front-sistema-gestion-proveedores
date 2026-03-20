import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerService } from '../../api/providerService';
import { vehicleService } from '../../api/vehicleService';
import { certificationService } from '../../api/certificationService';
import { documentService } from '../../api/documentService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { exportProviderReportExcel, exportProviderReportPDF } from '../../utils/reportExportService';
import { VehicleModal } from '../../components/providers/VehicleModal';
import { CertificationModal } from '../../components/providers/CertificationModal';
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal';
import { DocumentsList } from '../../components/documents/DocumentsList';
import { RequiredDocumentsList } from '../../components/documents/RequiredDocumentsList';
import { providerTypeService } from '../../api/providerTypeService';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../utils/toast';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit, Building2, MapPin, Phone, Mail, CreditCard,
  FileText, Users, Truck, Award, Plus, Trash2, Pencil,
  AlertCircle, ShieldCheck,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Activo',    color: 'text-green-700 bg-green-100 border-green-300'   },
  { value: 'pending',  label: 'Pendiente', color: 'text-yellow-700 bg-yellow-100 border-yellow-300' },
  { value: 'inactive', label: 'Inactivo',  color: 'text-gray-700 bg-gray-100 border-gray-300'       },
  { value: 'rejected', label: 'Rechazado', color: 'text-red-700 bg-red-100 border-red-300'           },
];
const STATUS_VARIANT = { active: 'success', pending: 'warning', inactive: 'info', rejected: 'danger' };
const STATUS_LABEL   = { active: 'Activo',  pending: 'Pendiente', inactive: 'Inactivo', rejected: 'Rechazado' };

// ─── Modal cambio de status ───────────────────────────────────────────────────
const ChangeStatusModal = ({ isOpen, onClose, provider, onSuccess }) => {
  const [newStatus, setNewStatus]       = useState(provider?.status || 'pending');
  const [observations, setObservations] = useState(provider?.observations || '');

  const mutation = useMutation({
    mutationFn: () => providerService.updateStatus(provider.id, newStatus, observations),
    onSuccess: () => { toast.success(`Proveedor ${STATUS_LABEL[newStatus].toLowerCase()} correctamente`); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al cambiar estado'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={<div className="flex items-center gap-3"><div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary"><ShieldCheck className="w-5 h-5 text-white" /></div><span>Cambiar Estado del Proveedor</span></div>}
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()} disabled={newStatus === provider?.status}>Guardar cambio</Button></>}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Proveedor: <span className="font-semibold text-gray-900">{provider?.business_name}</span></p>
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo estado</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setNewStatus(opt.value)}
                className={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${newStatus === opt.value ? opt.color + ' border-current' : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Observaciones <span className="font-normal text-gray-400">(opcional)</span></label>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="Motivo del cambio de estado..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {newStatus === provider?.status && (
          <p className="px-3 py-2 text-xs text-center border rounded-lg text-amber-600 bg-amber-50 border-amber-200">Selecciona un estado diferente al actual para continuar</p>
        )}
      </div>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProviderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab]                     = useState('general');
  const [showVehicleModal, setShowVehicleModal]       = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [showStatusModal, setShowStatusModal]         = useState(false);
  const [selectedVehicle, setSelectedVehicle]         = useState(null);
  const [selectedCertification, setSelectedCertification] = useState(null);

  const { user } = useAuthStore();
  const userRole      = user?.roles?.[0]?.name || user?.roles?.[0] || user?.role || '';
  const isAdminOrSuper = ['super_admin', 'admin'].includes(userRole);
  const isCalidad     = userRole === 'calidad';
  const isCompras     = userRole === 'compras';
  const canEdit       = isCompras || isAdminOrSuper;
  const canChangeStatus = isCalidad || isAdminOrSuper;

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providerService.getById(id),
  });
  const providerData = provider?.provider || provider;

  // ✅ Query de documentos para el reporte
  const { data: docsData } = useQuery({
    queryKey: ['provider-documents', id],
    queryFn: () => documentService.getByProvider(id),
    enabled: !!id,
  });
  const providerDocuments = docsData?.documents || [];

  const { data: documentTypesData, isLoading: isLoadingDocTypes } = useQuery({
    queryKey: ['provider-document-types', providerData?.provider_type_id],
    queryFn: () => providerTypeService.getRequiredDocuments(providerData?.provider_type_id),
    enabled: !!providerData?.provider_type_id,
  });

  let documentTypes = [];
  if (documentTypesData?.required_documents) {
    if (Array.isArray(documentTypesData.required_documents)) documentTypes = documentTypesData.required_documents;
    else { const g = documentTypesData.required_documents; documentTypes = [...(g.fiscal||[]),...(g.legal||[]),...(g.quality||[]),...(g.technical||[])]; }
  } else if (documentTypesData?.document_types) documentTypes = documentTypesData.document_types;
  else if (Array.isArray(documentTypesData)) documentTypes = documentTypesData;

  const handleAddVehicle    = () => { setSelectedVehicle(null);       setShowVehicleModal(true); };
  const handleEditVehicle   = (v) => { setSelectedVehicle(v);         setShowVehicleModal(true); };
  const handleAddCert       = () => { setSelectedCertification(null); setShowCertificationModal(true); };
  const handleEditCert      = (c) => { setSelectedCertification(c);   setShowCertificationModal(true); };

  const handleDeleteVehicle = (vehicle) => toast((t) => (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-gray-900">¿Eliminar el vehículo <span className="text-primary-600">"{vehicle.brand_model}"</span>?</p>
      <p className="text-sm text-gray-600">Placas: {vehicle.plates}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
        <Button variant="danger" size="sm" onClick={() => { deleteVehicleMutation.mutate(vehicle.id); toast.dismiss(t.id); }}>Eliminar</Button>
      </div>
    </div>
  ), { duration: Infinity, position: 'top-center', style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' } });

  const handleDeleteCert = (cert) => toast((t) => (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-gray-900">¿Eliminar la certificación <span className="text-primary-600">"{cert.certification_type}"</span>?</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
        <Button variant="danger" size="sm" onClick={() => { deleteCertificationMutation.mutate(cert.id); toast.dismiss(t.id); }}>Eliminar</Button>
      </div>
    </div>
  ), { duration: Infinity, position: 'top-center', style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' } });

  const vehicleMutation = useMutation({
    mutationFn: (data) => selectedVehicle?.id ? vehicleService.update(id, selectedVehicle.id, data) : vehicleService.create(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['provider', id]); setShowVehicleModal(false); setSelectedVehicle(null); showToast.success(selectedVehicle ? '✅ Vehículo actualizado' : '🎉 Vehículo agregado'); },
    onError: () => showToast.error('Error al guardar vehículo'),
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId) => vehicleService.delete(id, vehicleId),
    onSuccess: () => { queryClient.invalidateQueries(['provider', id]); showToast.success('🗑️ Vehículo eliminado'); },
    onError: () => showToast.error('Error al eliminar vehículo'),
  });
  const certificationMutation = useMutation({
    mutationFn: (data) => selectedCertification?.id ? certificationService.update(id, selectedCertification.id, data) : certificationService.create(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['provider', id]); setShowCertificationModal(false); setSelectedCertification(null); showToast.success(selectedCertification ? '✅ Certificación actualizada' : '🎉 Certificación agregada'); },
    onError: () => showToast.error('Error al guardar certificación'),
  });
  const deleteCertificationMutation = useMutation({
    mutationFn: (certId) => certificationService.delete(id, certId),
    onSuccess: () => { queryClient.invalidateQueries(['provider', id]); showToast.success('🗑️ Certificación eliminada'); },
    onError: () => showToast.error('Error al eliminar certificación'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" /></div>;
  if (error) return <div className="p-8"><div className="p-6 text-center border-2 border-red-200 rounded-xl bg-red-50"><AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" /><p className="font-semibold text-red-900">Error al cargar proveedor</p><p className="mt-2 text-sm text-red-700">{error.message}</p></div></div>;
  if (!providerData) return <div className="p-8"><div className="p-6 text-center text-gray-600 border-2 border-gray-200 rounded-xl bg-gray-50"><p className="font-semibold">Proveedor no encontrado</p></div></div>;

  const tabs = [
    { id: 'general',        label: 'Información General', icon: Building2 },
    { id: 'contacts',       label: 'Contactos',           icon: Users     },
    { id: 'vehicles',       label: 'Vehículos',           icon: Truck     },
    { id: 'certifications', label: 'Certificaciones',     icon: Award     },
    { id: 'documents',      label: 'Documentos',          icon: FileText  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/providers')} className="mb-4">
          Volver a Proveedores
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-gradient-primary">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{providerData.business_name}</h1>
              <p className="mt-1 font-mono text-sm text-gray-600">RFC: {providerData.rfc}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={STATUS_VARIANT[providerData.status] || 'info'}>
              {STATUS_LABEL[providerData.status] || providerData.status}
            </Badge>

            {/* ✅ Exportar reporte completo del proveedor */}
            <ExportButtons
              label="Reporte"
              onExcelExport={() => exportProviderReportExcel(providerData, providerDocuments)}
              onPdfExport={() => exportProviderReportPDF(providerData, providerDocuments)}
            />

            {canChangeStatus && (
              <Button variant="secondary" leftIcon={<ShieldCheck className="w-4 h-4" />} onClick={() => setShowStatusModal(true)}>
                Cambiar estado
              </Button>
            )}
            {canEdit && (
              <Button variant="primary" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/providers/${id}/edit`)}>
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <nav className="flex overflow-x-auto border-b-2 border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap
                  ${isActive ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-6">
          {activeTab === 'general'        && <GeneralInfo provider={providerData} />}
          {activeTab === 'contacts'       && <ContactsInfo contacts={providerData.contacts || []} />}
          {activeTab === 'vehicles'       && <VehiclesInfo vehicles={providerData.vehicles || []} onAdd={handleAddVehicle} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} canEdit={canEdit} />}
          {activeTab === 'certifications' && <CertificationsInfo certifications={providerData.certifications || []} onAdd={handleAddCert} onEdit={handleEditCert} onDelete={handleDeleteCert} canEdit={canEdit} />}
          {activeTab === 'documents'      && <DocumentsInfo providerId={id} providerData={providerData} documentTypes={documentTypes} isLoadingDocTypes={isLoadingDocTypes} canUpload={canEdit} />}
        </div>
      </div>

      <VehicleModal isOpen={showVehicleModal} onClose={() => { setShowVehicleModal(false); setSelectedVehicle(null); }} onSave={(data) => vehicleMutation.mutate(data)} vehicle={selectedVehicle} />
      <CertificationModal isOpen={showCertificationModal} onClose={() => { setShowCertificationModal(false); setSelectedCertification(null); }} onSave={(data) => certificationMutation.mutate(data)} certification={selectedCertification} />
      {showStatusModal && <ChangeStatusModal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} provider={providerData} onSuccess={() => queryClient.invalidateQueries(['provider', id])} />}
    </div>
  );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const GeneralInfo = ({ provider }) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <Card title="Información de la Empresa" variant="elevated"><div className="space-y-4"><InfoRow icon={Building2} label="Razón Social" value={provider.business_name} /><InfoRow label="RFC" value={provider.rfc} /><InfoRow label="Representante Legal" value={provider.legal_representative || 'N/A'} /><InfoRow label="Tipo de Proveedor" value={provider.provider_type?.name || 'N/A'} /></div></Card>
    <Card title="Dirección" variant="elevated"><div className="space-y-4"><InfoRow icon={MapPin} label="Calle" value={`${provider.street||''} ${provider.exterior_number||''} ${provider.interior_number||''}`.trim()||'N/A'} /><InfoRow label="Colonia" value={provider.neighborhood||'N/A'} /><InfoRow label="Ciudad" value={provider.city||'N/A'} /><InfoRow label="Estado" value={provider.state||'N/A'} /><InfoRow label="Código Postal" value={provider.postal_code||'N/A'} /></div></Card>
    <Card title="Contacto" variant="elevated"><div className="space-y-4"><InfoRow icon={Phone} label="Teléfono" value={provider.phone||'N/A'} /><InfoRow icon={Mail} label="Email" value={provider.email||'N/A'} /></div></Card>
    <Card title="Información Bancaria" variant="elevated"><div className="space-y-4"><InfoRow icon={CreditCard} label="Banco" value={provider.bank||'N/A'} /><InfoRow label="Sucursal" value={provider.bank_branch||'N/A'} /><InfoRow label="Cuenta" value={provider.account_number||'N/A'} /><InfoRow label="CLABE" value={provider.clabe||'N/A'} /></div></Card>
    <Card title="Información Crediticia" variant="elevated"><div className="space-y-4"><InfoRow label="Monto de Crédito" value={provider.credit_amount ? `$${parseFloat(provider.credit_amount).toLocaleString('es-MX',{minimumFractionDigits:2})}` : 'N/A'} /><InfoRow label="Días de Crédito" value={provider.credit_days ? `${provider.credit_days} días` : 'N/A'} /></div></Card>
    <Card title="Productos y Servicios" variant="elevated"><div className="space-y-4"><div><p className="mb-1 text-sm font-semibold text-gray-700">Productos</p><p className="text-sm text-gray-600">{provider.products||'N/A'}</p></div><div><p className="mb-1 text-sm font-semibold text-gray-700">Servicios</p><p className="text-sm text-gray-600">{provider.services||'N/A'}</p></div></div></Card>
    {provider.observations && <Card title="Observaciones" variant="elevated" className="lg:col-span-2"><p className="text-sm text-gray-600">{provider.observations}</p></Card>}
  </div>
);

const ContactsInfo = ({ contacts }) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {contacts.length === 0 ? (
      <div className="py-12 text-center border-2 border-gray-300 border-dashed col-span-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"><div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-50"><Users className="w-8 h-8 text-primary-500" /></div><p className="font-medium text-gray-900">No hay contactos registrados</p></div>
    ) : contacts.map((contact, index) => {
      const typeConfig = { sales: { label:'Ventas', color:'from-blue-500 to-blue-600', variant:'info' }, billing: { label:'Cobranza', color:'from-primary-500 to-primary-600', variant:'primary' }, quality: { label:'Calidad', color:'from-green-500 to-green-600', variant:'success' } };
      const config = typeConfig[contact.type] || { label:contact.type, color:'from-gray-500 to-gray-600', variant:'inactive' };
      return (
        <div key={index} className="p-5 transition-all duration-200 bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg">
          <div className="flex items-center gap-3 mb-4"><div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} shadow-md`}><Users className="w-6 h-6 text-white" /></div><div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 truncate">{contact.name}</h3><Badge variant={config.variant} className="mt-1">{config.label}</Badge></div></div>
          <div className="space-y-2"><p className="flex items-center text-sm text-gray-600"><Phone className="w-4 h-4 mr-2 text-primary-500" />{contact.phone||'N/A'}</p><p className="flex items-center text-sm text-gray-600 truncate"><Mail className="w-4 h-4 mr-2 text-primary-500" />{contact.email||'N/A'}</p></div>
        </div>
      );
    })}
  </div>
);

const VehiclesInfo = ({ vehicles, onAdd, onEdit, onDelete, canEdit }) => (
  <div>
    {canEdit && <div className="flex justify-end mb-6"><Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>Agregar Vehículo</Button></div>}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {vehicles.length === 0 ? (
        <div className="py-12 text-center border-2 border-gray-300 border-dashed col-span-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"><div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-50"><Truck className="w-8 h-8 text-blue-500" /></div><p className="mb-1 font-medium text-gray-900">No hay vehículos registrados</p>{canEdit && <Button variant="ghost" leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd} className="mt-3">Agregar primer vehículo</Button>}</div>
      ) : vehicles.map((vehicle) => (
        <div key={vehicle.id} className="p-5 transition-all duration-200 bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-primary-200">
          <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-blue-500 to-blue-600"><Truck className="w-6 h-6 text-white" /></div><div><p className="text-lg font-bold text-gray-900">{vehicle.plates}</p><p className="text-sm text-gray-600">{vehicle.brand_model}</p></div></div><Badge variant={vehicle.is_active?'active':'inactive'}>{vehicle.is_active?'Activo':'Inactivo'}</Badge></div>
          {vehicle.color && <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-gray-50"><p className="text-xs font-semibold text-gray-600 uppercase">Color</p><p className="text-sm font-bold text-gray-900">{vehicle.color}</p></div>}
          {canEdit && <div className="flex gap-2 pt-4 border-t-2 border-gray-200"><Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(vehicle)} className="flex-1">Editar</Button><button onClick={() => onDelete(vehicle)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>}
        </div>
      ))}
    </div>
  </div>
);

const CertificationsInfo = ({ certifications, onAdd, onEdit, onDelete, canEdit }) => (
  <div>
    {canEdit && <div className="flex justify-end mb-6"><Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>Agregar Certificación</Button></div>}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {certifications.length === 0 ? (
        <div className="py-12 text-center border-2 border-gray-300 border-dashed col-span-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"><div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-amber-50"><Award className="w-8 h-8 text-amber-500" /></div><p className="mb-1 font-medium text-gray-900">No hay certificaciones registradas</p>{canEdit && <Button variant="ghost" leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd} className="mt-3">Agregar primera certificación</Button>}</div>
      ) : certifications.map((cert) => (
        <div key={cert.id} className="p-5 transition-all duration-200 bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-primary-200">
          <div className="flex items-start gap-4 mb-4"><div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-amber-500 to-amber-600"><Award className="w-6 h-6 text-white" /></div><div className="flex-1 min-w-0"><h4 className="font-bold text-gray-900 truncate">{cert.certification_type==='Otro'?cert.other_name:cert.certification_type}</h4><p className="mt-1 text-sm text-gray-600">{cert.certifying_body||'Sin organismo certificador'}</p></div></div>
          <div className="grid grid-cols-2 gap-3 mb-4"><div className="p-3 border border-gray-200 rounded-lg bg-gray-50"><p className="text-xs font-semibold text-gray-600 uppercase">Emisión</p><p className="text-sm font-bold text-gray-900">{cert.issue_date?new Date(cert.issue_date).toLocaleDateString('es-MX'):'N/A'}</p></div><div className="p-3 border border-red-200 rounded-lg bg-red-50"><p className="text-xs font-semibold text-gray-600 uppercase">Vencimiento</p><p className="text-sm font-bold text-red-700">{cert.expiry_date?new Date(cert.expiry_date).toLocaleDateString('es-MX'):'N/A'}</p></div></div>
          {cert.certificate_number && <p className="p-2 mb-4 font-mono text-xs text-gray-500 border border-gray-200 rounded bg-gray-50">Certificado: {cert.certificate_number}</p>}
          {canEdit && <div className="flex gap-2 pt-4 border-t-2 border-gray-200"><Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(cert)} className="flex-1">Editar</Button><button onClick={() => onDelete(cert)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>}
        </div>
      ))}
    </div>
  </div>
);

const DocumentsInfo = ({ providerId, providerData, documentTypes, isLoadingDocTypes, canUpload }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary-600" /><h2 className="text-xl font-bold text-gray-900">Documentos del Proveedor</h2></div>
        {canUpload && <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowUploadModal(true)} disabled={isLoadingDocTypes}>Subir Documento</Button>}
      </div>
      {isLoadingDocTypes && <div className="flex items-center justify-center p-4 mb-4 border-2 border-primary-200 rounded-xl bg-primary-50"><div className="w-5 h-5 mr-2 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" /><p className="text-sm font-semibold text-primary-700">Cargando tipos de documentos...</p></div>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1"><RequiredDocumentsList providerId={providerId} /></div>
        <div className="lg:col-span-2"><DocumentsList providerId={providerId} /></div>
      </div>
      <DocumentUploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} providerId={providerId} documentTypes={documentTypes} />
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start">
    {Icon && <Icon className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
      <p className="mt-1 text-sm text-gray-900 truncate">{value}</p>
    </div>
  </div>
);
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { providerDashboardService } from '../../api/providerDashboardService';
import { providerProfileService } from '../../api/providerProfileService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  FileText, CheckCircle, Clock, AlertTriangle, Upload,
  TrendingUp, Calendar, User, ChevronRight, Users, Truck, UserCheck,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REQUIRED_PROFILE_FIELDS = [
  // Contacto
  'phone',
  // Dirección
  'street', 'city', 'state', 'postal_code',
  // Empresa
  'legal_representative',
  // Bancaria
  'bank', 'clabe',
  // Crédito
  'credit_days',
  // Productos/Servicios
  'products',
];

const isProfileComplete = (provider) => {
  if (!provider) return false;
  return REQUIRED_PROFILE_FIELDS.every(field => !!provider[field]?.toString().trim());
};

// ─── Tarjeta de progreso reutilizable ────────────────────────────────────────
const ProgressCard = ({ complete, incompleteConfig, completeConfig, onClick }) => {
  const cfg = complete ? completeConfig : incompleteConfig;
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
        ${complete ? 'border-green-200 bg-green-50' : cfg.border + ' bg-white hover:scale-[1.01]'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
          ${complete ? 'bg-green-100' : cfg.iconBg}`}>
          {complete
            ? <CheckCircle className="w-5 h-5 text-green-600" />
            : <cfg.Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${complete ? 'text-green-800' : 'text-gray-900'}`}>
            {complete ? completeConfig.title : incompleteConfig.title}
          </p>
          <p className={`text-xs mt-0.5 ${complete ? 'text-green-600' : 'text-gray-500'}`}>
            {complete ? completeConfig.desc : incompleteConfig.desc}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${complete ? 'text-green-400' : 'text-gray-300'}`} />
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const ProviderDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: providerDashboardService.getStats,
  });

  const { data: documentsData, isLoading: loadingDocuments } = useQuery({
    queryKey: ['provider-documents'],
    queryFn: providerDashboardService.getDocuments,
  });

  const { data: expiringData, isLoading: loadingExpiring } = useQuery({
    queryKey: ['provider-expiring-documents'],
    queryFn: providerDashboardService.getExpiringDocuments,
  });

  // ✅ Un solo call que trae perfil + contactos + vehículos + personal
  const { data: profileData } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerProfileService.getProfile,
  });

  // ─── Estados de progreso ────────────────────────────────────────────────────
  const provider        = profileData?.provider;
  const profileComplete = isProfileComplete(provider);
  const hasContacts     = (provider?.contacts?.length ?? 0) > 0;
  const hasVehicles     = (provider?.vehicles?.length ?? 0) > 0;
  const hasPersonnel    = (provider?.personnel?.length ?? 0) > 0;

  // Cuántas tarjetas están completas (para el banner de bienvenida)
  const completedCount  = [profileComplete, hasContacts, hasVehicles, hasPersonnel].filter(Boolean).length;
  const allComplete     = completedCount === 4;

  const stats           = statsData?.stats || { total: 0, approved: 0, pending: 0, rejected: 0, expiring: 0 };
  const recentDocuments = documentsData?.documents?.slice(0, 3) || [];
  const expiringDocuments = expiringData?.expiring_documents || [];

  const getStatusVariant = (status) => ({ approved: 'active', pending: 'pending', rejected: 'rejected' }[status] || 'inactive');
  const getStatusText    = (status) => ({ approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado' }[status] || status);

  const handleExpiringDocClick = (doc) => {
    navigate(`/provider/documents?search=${encodeURIComponent(doc.name)}`);
  };

  if (loadingStats || loadingDocuments) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido, {user?.name}!</h1>
            <p className="text-sm text-gray-600">
              {allComplete
                ? '✅ Tu perfil está completo y tus documentos están al día.'
                : `Completa tu perfil — ${completedCount}/4 secciones listas`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden p-6 rounded-xl bg-white border-2 border-primary-200 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Total Documentos</p>
              <p className="mt-3 text-4xl font-bold text-primary-600">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg shadow-md bg-gradient-to-br from-primary-500 to-primary-600">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600" />
        </div>

        <div className="relative overflow-hidden p-6 rounded-xl bg-white border-2 border-green-200 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Aprobados</p>
              <p className="mt-3 text-4xl font-bold text-green-600">{stats.approved}</p>
              {stats.total > 0 && (
                <div className="flex items-center mt-3 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  <span className="font-semibold">{((stats.approved / stats.total) * 100).toFixed(0)}% del total</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg shadow-md bg-gradient-to-br from-green-500 to-green-600">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </div>

        <div className="relative overflow-hidden p-6 rounded-xl bg-white border-2 border-accent-200 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Pendientes</p>
              <p className="mt-3 text-4xl font-bold text-accent-600">{stats.pending}</p>
              <p className="mt-3 text-sm text-gray-600">En revisión por Calidad</p>
            </div>
            <div className="p-3 rounded-lg shadow-md bg-gradient-to-br from-accent-500 to-accent-600">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-500 to-accent-600" />
        </div>

        <div className="relative overflow-hidden p-6 rounded-xl bg-white border-2 border-alert-200 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Por Vencer</p>
              <p className="mt-3 text-4xl font-bold text-alert-600">{stats.expiring}</p>
              <p className="mt-3 text-sm text-gray-600">Requiere atención pronto</p>
            </div>
            <div className="p-3 rounded-lg shadow-md bg-gradient-to-br from-alert-500 to-alert-600">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-alert-500 to-alert-600" />
        </div>
      </div>

      {/* Documentos por vencer */}
      {!loadingExpiring && expiringDocuments.length > 0 && (
        <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-alert-50 to-red-50 border-alert-200">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-alert-500 to-alert-600">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-gray-900">Documentos próximos a vencer</h3>
              <p className="mb-4 text-sm text-gray-700">Haz clic en cualquier documento para renovarlo</p>
              <ul className="mb-4 space-y-3">
                {expiringDocuments.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => handleExpiringDocClick(doc)}
                      className="flex items-center justify-between w-full p-4 text-left transition-all duration-200 bg-white border-2 border-gray-200 rounded-xl hover:border-alert-400 hover:shadow-md hover:bg-alert-50 group"
                    >
                      <div className="flex items-center flex-1 min-w-0 gap-3">
                        <div className="flex items-center justify-center flex-shrink-0 transition-colors rounded-lg w-9 h-9 bg-alert-100 group-hover:bg-alert-200">
                          <FileText className="w-4 h-4 text-alert-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{doc.name}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            Vence el {new Date(doc.expiry_date).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center flex-shrink-0 gap-2 ml-3">
                        <Badge variant={doc.urgency === 'critical' ? 'expired' : doc.urgency === 'warning' ? 'alert' : 'warning'}>
                          {doc.days_left} días
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-400 transition-colors group-hover:text-alert-500" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={() => navigate('/provider/documents')}>
                Ver todos los documentos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Documentos Recientes + Panel derecho */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Documentos Recientes */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Documentos Recientes</h2>
              </div>
            </div>
            <div className="p-6">
              {recentDocuments.length > 0 ? (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 transition-all duration-200 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary-200">
                      <div className="flex items-center flex-1 min-w-0 gap-4">
                        <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{doc.document_type?.name || doc.file_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(doc.uploaded_at).toLocaleDateString('es-MX')}
                            </span>
                            {doc.expiry_date && <span>Vence: {new Date(doc.expiry_date).toLocaleDateString('es-MX')}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(doc.status)}>{getStatusText(doc.status)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-50">
                    <FileText className="w-8 h-8 text-primary-500" />
                  </div>
                  <p className="mb-2 font-medium text-gray-900">Aún no has cargado documentos</p>
                  <p className="mb-4 text-sm text-gray-600">Comienza subiendo tu primer documento</p>
                  <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />} onClick={() => navigate('/provider/upload')}>
                    Cargar primer documento
                  </Button>
                </div>
              )}
              {recentDocuments.length > 0 && (
                <Button variant="ghost" onClick={() => navigate('/provider/documents')} className="w-full mt-6">
                  Ver todos los documentos
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Cargar Documentos — siempre visible */}
          <div className="p-6 text-white shadow-md bg-gradient-primary rounded-xl">
            <div className="flex items-center justify-center mb-4 rounded-lg w-14 h-14 bg-white/20 backdrop-blur-sm">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Cargar Documentos</h3>
            <p className="mb-4 text-sm text-primary-100">Sube los documentos requeridos para mantener tu cuenta activa</p>
            <button
              onClick={() => navigate('/provider/upload')}
              className="w-full px-4 py-3 bg-white text-primary-600 font-bold rounded-lg hover:bg-primary-50 transition-all duration-200 transform hover:scale-[1.02] shadow-md"
            >
              Subir Documentos
            </button>
          </div>

          {/* ✅ 4 tarjetas de progreso del perfil */}
          <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">Completud del perfil</p>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {completedCount}/4
                </span>
              </div>
              {/* Barra de progreso */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-primary-500 to-green-500"
                  style={{ width: `${(completedCount / 4) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-3 space-y-2">
              {/* Información General */}
              <ProgressCard
                complete={profileComplete}
                onClick={() => navigate('/provider/profile')}
                incompleteConfig={{
                  title: 'Información General',
                  desc: 'Teléfono, dirección y datos de empresa',
                  border: 'border-amber-200',
                  iconBg: 'bg-amber-100',
                  iconColor: 'text-amber-600',
                  Icon: User,
                }}
                completeConfig={{
                  title: 'Información General',
                  desc: 'Datos completos ✓',
                }}
              />

              {/* Contactos */}
              <ProgressCard
                complete={hasContacts}
                onClick={() => navigate('/provider/profile?tab=contacts')}
                incompleteConfig={{
                  title: 'Contactos',
                  desc: 'Agrega al menos un contacto',
                  border: 'border-blue-200',
                  iconBg: 'bg-blue-100',
                  iconColor: 'text-blue-600',
                  Icon: Users,
                }}
                completeConfig={{
                  title: 'Contactos',
                  desc: `${provider?.contacts?.length} contacto(s) registrado(s) ✓`,
                }}
              />

              {/* Vehículos */}
              <ProgressCard
                complete={hasVehicles}
                onClick={() => navigate('/provider/profile?tab=vehicles')}
                incompleteConfig={{
                  title: 'Vehículos',
                  desc: 'Registra vehículos autorizados',
                  border: 'border-purple-200',
                  iconBg: 'bg-purple-100',
                  iconColor: 'text-purple-600',
                  Icon: Truck,
                }}
                completeConfig={{
                  title: 'Vehículos',
                  desc: `${provider?.vehicles?.length} vehículo(s) registrado(s) ✓`,
                }}
              />

              {/* Personal */}
              <ProgressCard
                complete={hasPersonnel}
                onClick={() => navigate('/provider/profile?tab=personnel')}
                incompleteConfig={{
                  title: 'Personal Autorizado',
                  desc: 'Registra el personal que visita',
                  border: 'border-rose-200',
                  iconBg: 'bg-rose-100',
                  iconColor: 'text-rose-600',
                  Icon: UserCheck,
                }}
                completeConfig={{
                  title: 'Personal Autorizado',
                  desc: `${provider?.personnel?.length} persona(s) registrada(s) ✓`,
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
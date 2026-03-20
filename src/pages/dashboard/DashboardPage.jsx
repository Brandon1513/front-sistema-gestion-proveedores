import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../api/dashboardService';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ExportButtons } from '../../components/common/ExportButtons';
import { exportExpiringDocsExcel, exportExpiringDocsPDF } from '../../utils/reportExportService';
import {
  Users, FileText, AlertTriangle, CheckCircle,
  Clock, XCircle, TrendingUp, Package, ChevronRight,
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const userRole  = user?.roles?.[0]?.name || user?.roles?.[0] || user?.role || '';
  const isCompras = userRole === 'compras';

  // ✅ Rutas inteligentes según rol
  const docsRoute     = isCompras ? '/documents/status' : '/documents/validation';
  const pendingRoute  = (docId) => isCompras ? '/documents/status' : `/documents/validation?document=${docId}`;
  const expiringRoute = (pId, dId) => isCompras ? '/documents/status' : `/documents?provider=${pId}&doc=${dId}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getStats,
    retry: false,
  });

  // ✅ Query separada para TODOS los docs por vencer — solo se usa al exportar
  const { data: allExpiringData, refetch: fetchAllExpiring } = useQuery({
    queryKey: ['all-expiring-documents'],
    queryFn: () => dashboardService.getExpiringDocuments(30),
    enabled: false, // no carga automáticamente, solo al exportar
  });

  // Función que obtiene todos los docs y luego exporta
  const handleExportExcel = async () => {
    const result = await fetchAllExpiring();
    const docs = result?.data?.documents || [];
    exportExpiringDocsExcel(docs);
  };

  const handleExportPDF = async () => {
    const result = await fetchAllExpiring();
    const docs = result?.data?.documents || [];
    exportExpiringDocsPDF(docs);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6 border-2 border-red-200 rounded-xl bg-red-50">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
        <p className="font-semibold text-red-900">Error al cargar el dashboard</p>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const expiringDocs = data?.expiring_documents || [];

  const statCards = [
    { title: 'Total Proveedores',     value: stats.total_providers  || 0, gradient: 'from-primary-500 to-primary-600', border: 'border-primary-200', textColor: 'text-primary-600', icon: Users,         onClick: () => navigate('/providers') },
    { title: 'Proveedores Activos',   value: stats.active_providers || 0, gradient: 'from-green-500 to-green-600',    border: 'border-green-200',   textColor: 'text-green-600',   icon: CheckCircle,   onClick: () => navigate('/providers?status=active') },
    { title: 'Documentos Pendientes', value: stats.pending_documents|| 0, gradient: 'from-accent-500 to-accent-600',  border: 'border-accent-200',  textColor: 'text-accent-600',  icon: Clock,         onClick: () => navigate(docsRoute) },
    { title: 'Documentos Vencidos',   value: stats.expired_documents|| 0, gradient: 'from-red-500 to-red-600',        border: 'border-red-200',     textColor: 'text-red-600',     icon: AlertTriangle, onClick: () => navigate(docsRoute) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Resumen general del sistema</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <button
            key={stat.title}
            onClick={stat.onClick}
            className={`relative overflow-hidden p-6 rounded-xl bg-white border-2 ${stat.border}
              hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] text-left group`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">{stat.title}</p>
                <p className={`mt-3 text-4xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`bg-gradient-to-br ${stat.gradient} p-3 rounded-lg shadow-md`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <p className="text-xs text-gray-400 transition-colors group-hover:text-gray-600">Ver detalle</p>
              <ChevronRight className="w-3 h-3 text-gray-400 transition-colors group-hover:text-gray-600" />
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Proveedores por estado */}
        <Card title={<div className="flex items-center gap-2"><Package className="w-5 h-5 text-primary-600" /><span>Proveedores por Estado</span></div>} variant="elevated">
          {data?.providers_by_status?.length > 0 ? (
            <div className="space-y-3">
              {data.providers_by_status.map((item, index) => {
                const statusConfig = {
                  active:   { label: 'Activos',    variant: 'active',    icon: CheckCircle   },
                  pending:  { label: 'Pendientes', variant: 'pending',   icon: Clock         },
                  inactive: { label: 'Inactivos',  variant: 'inactive',  icon: XCircle       },
                  rejected: { label: 'Rechazados', variant: 'rejected',  icon: AlertTriangle },
                };
                const config = statusConfig[item.status] || { label: item.status, variant: 'info', icon: FileText };
                const Icon = config.icon;
                return (
                  <button key={index} onClick={() => navigate(`/providers?status=${item.status}`)}
                    className="flex items-center justify-between w-full p-4 transition-all duration-200 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:border-primary-200 hover:shadow-sm group">
                    <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-gray-500" /><span className="font-semibold text-gray-900">{config.label}</span></div>
                    <div className="flex items-center gap-2"><Badge variant={config.variant}>{item.total}</Badge><ChevronRight className="w-4 h-4 text-gray-300 transition-colors group-hover:text-gray-500" /></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center"><Package className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-sm text-gray-500">No hay datos disponibles</p></div>
          )}
        </Card>

        {/* Proveedores por tipo */}
        <Card title={<div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary-600" /><span>Proveedores por Tipo</span></div>} variant="elevated">
          {data?.providers_by_type?.length > 0 ? (
            <div className="space-y-3">
              {data.providers_by_type.map((item, index) => (
                <button key={index} onClick={() => navigate(`/providers?type=${item.provider_type_id}`)}
                  className="flex items-center justify-between w-full p-4 transition-all duration-200 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:border-primary-200 hover:shadow-sm group">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary-500" /><span className="font-semibold text-gray-900">{item.provider_type_name || item.name || 'Sin tipo'}</span></div>
                  <div className="flex items-center gap-2"><Badge variant="info">{item.total}</Badge><ChevronRight className="w-4 h-4 text-gray-300 transition-colors group-hover:text-gray-500" /></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-sm text-gray-500">No hay datos disponibles</p></div>
          )}
        </Card>

        {/* Documentos pendientes */}
        <Card title={<div className="flex items-center gap-2"><Clock className="w-5 h-5 text-accent-600" /><span>Documentos Pendientes de Validación</span></div>} variant="elevated">
          {data?.recent_pending_documents?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_pending_documents.slice(0, 5).map((doc) => (
                <button key={doc.id} onClick={() => navigate(pendingRoute(doc.id))}
                  className="flex items-center justify-between w-full p-4 text-left transition-all duration-200 border-2 rounded-xl bg-gradient-to-r from-accent-50 to-white border-accent-200 hover:shadow-md hover:border-accent-400 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{doc.provider?.business_name || 'N/A'}</p>
                    <p className="text-sm text-gray-600 truncate">{doc.document_type?.name || 'N/A'}</p>
                  </div>
                  <div className="flex items-center flex-shrink-0 gap-2 ml-3">
                    <Badge variant="pending">Pendiente</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-300 transition-colors group-hover:text-accent-500" />
                  </div>
                </button>
              ))}
              <button onClick={() => navigate(docsRoute)} className="w-full pt-3 text-sm font-medium text-center border-t border-gray-100 text-primary-600 hover:text-primary-800">
                Ver todos los pendientes →
              </button>
            </div>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium text-gray-900">¡Todo al día!</p>
              <p className="text-sm text-gray-500">No hay documentos pendientes</p>
            </div>
          )}
        </Card>

        {/* ✅ Documentos próximos a vencer — con botón de exportación */}
        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Documentos Próximos a Vencer</span>
              </div>
              {/* ✅ Exportar TODOS los docs por vencer — llama al endpoint sin límite */}
              <ExportButtons
                onExcelExport={handleExportExcel}
                onPdfExport={handleExportPDF}
                disabled={expiringDocs.length === 0}
              />
            </div>
          }
          variant="elevated"
        >
          {expiringDocs.length > 0 ? (
            <div className="space-y-3">
              {expiringDocs.slice(0, 5).map((doc) => (
                <button key={doc.id}
                  onClick={() => navigate(expiringRoute(doc.provider_id || doc.provider?.id, doc.id))}
                  className="flex items-center justify-between w-full p-4 text-left transition-all duration-200 border-2 border-red-200 rounded-xl bg-gradient-to-r from-red-50 to-white hover:shadow-md hover:border-red-400 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{doc.provider?.business_name || 'N/A'}</p>
                    <p className="text-sm text-gray-600 truncate">{doc.document_type?.name || 'N/A'}</p>
                    <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600">
                      <Clock className="w-3 h-3" />
                      Vence: {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('es-MX') : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center flex-shrink-0 gap-2 ml-3">
                    <Badge variant="expired">Urgente</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-300 transition-colors group-hover:text-red-500" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium text-gray-900">¡Excelente!</p>
              <p className="text-sm text-gray-500">No hay documentos próximos a vencer</p>
            </div>
          )}
        </Card>

        {/* Actividad reciente */}
        {data?.recent_activity?.length > 0 && (
          <Card title={<div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /><span>Actividad Reciente</span></div>} variant="elevated" className="lg:col-span-2">
            <div className="space-y-3">
              {data.recent_activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 transition-all duration-200 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:border-primary-200">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md ${activity.action === 'approved' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                    {activity.action === 'approved' ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{activity.provider_document?.provider?.business_name || 'N/A'}</p>
                    <p className="text-sm text-gray-600 truncate">{activity.provider_document?.document_type?.name || 'N/A'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={activity.action === 'approved' ? 'active' : 'rejected'}>{activity.action === 'approved' ? 'Aprobado' : 'Rechazado'}</Badge>
                      <span className="text-xs text-gray-500">por {activity.validated_by?.name || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-500">
                    {activity.created_at ? new Date(activity.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { qualityDashboardService } from '../../api/qualityDashboardService';
import {
  TrendingUp, TrendingDown, CheckCircle, XCircle, Clock,
  FileText, BarChart3, Activity, Award, AlertTriangle,
  ClipboardCheck, ChevronRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PERIOD_LABELS = { day: 'Hoy', week: 'Esta Semana', month: 'Este Mes' };

// ─── Stat Card con estilo del sistema ────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, gradient, border, textColor, trend, urgent }) => (
  <div className={`relative overflow-hidden p-6 rounded-xl bg-white border-2 ${urgent ? 'border-red-300' : border} hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">{title}</p>
        <p className={`mt-3 text-4xl font-bold ${textColor}`}>{value}</p>
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up'   && <TrendingUp className="w-4 h-4 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className={`bg-gradient-to-br ${gradient} p-3 rounded-lg shadow-md`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
  </div>
);

// ─── Barra de distribución aprobados/rechazados ───────────────────────────────
const ApprovalChart = ({ data = {} }) => {
  const approved = data.approved || 0;
  const rejected = data.rejected || 0;
  const total    = approved + rejected;
  const appPct   = total > 0 ? (approved / total) * 100 : 0;
  const rejPct   = total > 0 ? (rejected / total) * 100 : 0;

  if (total === 0) return (
    <div className="py-10 text-center">
      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p className="text-sm text-gray-400">Sin validaciones en este período</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex h-10 rounded-xl overflow-hidden shadow-inner">
        {approved > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-sm font-bold transition-all"
            style={{ width: `${appPct}%` }}>
            {appPct > 12 && `${Math.round(appPct)}%`}
          </div>
        )}
        {rejected > 0 && (
          <div className="bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center text-white text-sm font-bold transition-all"
            style={{ width: `${rejPct}%` }}>
            {rejPct > 12 && `${Math.round(rejPct)}%`}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200 text-center">
          <p className="text-3xl font-bold text-green-600">{approved}</p>
          <p className="text-xs font-semibold text-green-700 uppercase mt-1">Aprobados</p>
          <p className="text-xs text-green-500 mt-0.5">{Math.round(appPct)}% del total</p>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-center">
          <p className="text-3xl font-bold text-red-600">{rejected}</p>
          <p className="text-xs font-semibold text-red-700 uppercase mt-1">Rechazados</p>
          <p className="text-xs text-red-500 mt-0.5">{Math.round(rejPct)}% del total</p>
        </div>
      </div>
    </div>
  );
};

// ─── Distribución por tipo de documento ──────────────────────────────────────
const DocumentTypeChart = ({ data = [] }) => {
  if (!data?.length) return (
    <div className="py-10 text-center">
      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p className="text-sm text-gray-400">Sin datos disponibles</p>
    </div>
  );
  const maxVal = Math.max(...data.map(d => d.total));
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 truncate max-w-[70%]">{item.name}</span>
            <span className="text-sm font-bold text-gray-900">{item.total}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-primary-500 to-primary-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(item.total / maxVal) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Top proveedores con rechazos ─────────────────────────────────────────────
const TopRejectedProviders = ({ data = [], onNavigate }) => {
  if (!data?.length) return (
    <div className="py-10 text-center">
      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
      <p className="text-sm text-gray-500">¡Sin rechazos recientes!</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {data.map((p, i) => (
        <button key={p.id} onClick={() => onNavigate(`/providers/${p.id}`)}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-red-50 border-2 border-red-100 hover:border-red-300 hover:shadow-sm transition-all group text-left">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-red-200 rounded-full flex-shrink-0">
              <span className="text-xs font-bold text-red-700">#{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{p.business_name}</p>
              <p className="text-xs text-gray-500 font-mono">{p.rfc || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-red-600">{p.rejections}</p>
              <p className="text-xs text-gray-400">rechazos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Top validadores ──────────────────────────────────────────────────────────
const TopValidators = ({ data = [] }) => {
  if (!data?.length) return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400">Sin datos disponibles</p>
    </div>
  );
  const maxVal = Math.max(...data.map(d => d.validations));
  return (
    <div className="space-y-3">
      {data.map((v, i) => (
        <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border-2 border-amber-100">
          <div className="flex items-center justify-center w-8 h-8 bg-amber-200 rounded-full flex-shrink-0">
            <span className="text-xs font-bold text-amber-700">#{i + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
            <div className="mt-1 w-full bg-amber-100 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full"
                style={{ width: `${(v.validations / maxVal) * 100}%` }} />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-amber-600">{v.validations}</p>
            <p className="text-xs text-gray-400">val.</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Actividad reciente ───────────────────────────────────────────────────────
const RecentActivity = ({ activities = [], loading }) => {
  if (loading) return <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" /></div>;
  if (!activities.length) return (
    <div className="py-10 text-center">
      <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p className="text-sm text-gray-400">Sin actividad reciente</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-4 p-4 border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all">
          <div className={`flex-shrink-0 p-2 rounded-lg ${a.action === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
            {a.action === 'approved'
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <XCircle className="w-5 h-5 text-red-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-semibold">{a.validator}</span>{' '}
              <span className={a.action === 'approved' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {a.action === 'approved' ? 'aprobó' : 'rechazó'}
              </span>{' '}
              <span className="font-medium">{a.document_type}</span>{' de '}
              <span className="font-medium">{a.provider}</span>
            </p>
            {a.comments && <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{a.comments}"</p>}
          </div>
          <p className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{a.validated_at}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const QualityDashboardPage = () => {
  const navigate  = useNavigate();
  const [period, setPeriod] = useState('month');

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['quality-stats', period],
    queryFn: () => qualityDashboardService.getStats(period),
    refetchInterval: 60000,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['quality-activity'],
    queryFn: () => qualityDashboardService.getRecentActivity(10),
    refetchInterval: 30000,
  });

  const stats      = statsData?.summary  || {};
  const charts     = statsData?.charts   || {};
  const rankings   = statsData?.rankings || {};
  const activities = activityData?.activities || [];

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { title: 'Total Validados',  value: stats.total_validated || 0, subtitle: PERIOD_LABELS[period],                          gradient: 'from-primary-500 to-primary-600', border: 'border-primary-200', textColor: 'text-primary-600', icon: FileText     },
    { title: 'Aprobados',        value: stats.approved        || 0, subtitle: `${stats.approval_rate || 0}% de aprobación`,   gradient: 'from-green-500 to-green-600',    border: 'border-green-200',   textColor: 'text-green-600',   icon: CheckCircle, trend: (stats.approval_rate || 0) >= 80 ? 'up' : 'down' },
    { title: 'Rechazados',       value: stats.rejected        || 0, subtitle: `${stats.total_validated > 0 ? Math.round((stats.rejected/stats.total_validated)*100) : 0}% del total`, gradient: 'from-red-500 to-red-600', border: 'border-red-200', textColor: 'text-red-600', icon: XCircle },
    { title: 'Pendientes',       value: stats.pending         || 0, subtitle: 'Requieren validación',                         gradient: 'from-accent-500 to-accent-600',  border: 'border-accent-200',  textColor: 'text-accent-600',  icon: Clock,       urgent: (stats.pending || 0) > 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Calidad</h1>
              <p className="text-sm text-gray-600">Métricas y estadísticas de validación de documentos</p>
            </div>
          </div>
          {/* Selector de período */}
          <div className="flex gap-2 bg-white border-2 border-gray-200 rounded-xl p-1">
            {['day', 'week', 'month'].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                  ${period === p ? 'bg-gradient-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      {/* Tiempo promedio */}
      <div className="p-6 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tiempo Promedio de Validación</h3>
            <p className="text-sm text-gray-500 mt-1">Desde carga hasta validación del documento</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-gray-900">{stats.avg_validation_time_hours || 0}</p>
              <p className="text-sm text-gray-500">horas promedio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            Distribución de Validaciones
          </h3>
          <ApprovalChart data={charts.approval_distribution} />
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Documentos Más Validados
          </h3>
          <DocumentTypeChart data={charts.document_type_distribution} />
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Proveedores con Más Rechazos
          </h3>
          <TopRejectedProviders data={rankings.top_rejected_providers} onNavigate={navigate} />
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Validadores Más Activos
          </h3>
          <TopValidators data={rankings.top_validators} />
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" />
          Actividad Reciente
        </h3>
        <RecentActivity activities={activities} loading={activityLoading} />
      </div>
    </div>
  );
};
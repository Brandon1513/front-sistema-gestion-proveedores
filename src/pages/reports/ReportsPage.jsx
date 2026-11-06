import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { providerService } from '../../api/providerService';
import { reportService } from '../../api/reportService';
import api from '../../api/axios';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  FileSpreadsheet, Download, Filter, Building2, Calendar, Tag, RotateCcw,
  Eye, RefreshCw, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Timer, UserX, ClipboardCheck, CheckCircle,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',          label: 'Todos los estados' },
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show',   label: 'No se presentó' },
];

const RECEPTION_STATUS_OPTIONS = [
  { value: '',              label: 'Todos' },
  { value: 'pending',       label: 'Pendiente' },
  { value: 'accepted',      label: 'Aceptado' },
  { value: 'partial',       label: 'Parcial' },
  { value: 'rejected',      label: 'Rechazado' },
  { value: 'not_delivered', label: 'No entregado' },
];

// ✅ Puntualidad (registrada por Seguridad al confirmar la entrada)
const PUNCTUALITY_OPTIONS = [
  { value: '',        label: 'Todas' },
  { value: 'on_time', label: 'A tiempo' },
  { value: 'late',    label: 'Con retraso' },
];

const PROVIDER_STATUS_OPTIONS = [
  { value: '',        label: 'Todos' },
  { value: 'active',  label: 'Activo' },
  { value: 'pending', label: 'Pendiente' },
];

const COMPLIANCE_OPTIONS = [
  { value: 'all',        label: 'Todos' },
  { value: 'incomplete', label: 'Con pendientes o faltantes' },
  { value: 'expired',    label: 'Con documentos vencidos' },
];

const STATUS_BADGE = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show:   'bg-orange-100 text-orange-700',
};

const RECEPTION_BADGE = {
  pending:       'bg-blue-100 text-blue-700',
  accepted:      'bg-teal-100 text-teal-700',
  partial:       'bg-amber-100 text-amber-700',
  rejected:      'bg-red-100 text-red-700',
  not_delivered: 'bg-slate-200 text-slate-700',
};

const EMPTY_APPOINTMENT_FILTERS = { date_from: '', date_to: '', provider_id: '', status: '', reception_status: '', punctuality: '' };

const cleanParams = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ''));
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Indicador del periodo ────────────────────────────────────────────────────
// Clases completas (no armadas con template strings) para que Tailwind las genere
const SUMMARY_COLORS = {
  emerald: { border: 'border-emerald-200', icon: 'text-emerald-500', value: 'text-emerald-600' },
  amber:   { border: 'border-amber-200',   icon: 'text-amber-500',   value: 'text-amber-600'   },
  orange:  { border: 'border-orange-200',  icon: 'text-orange-500',  value: 'text-orange-600'  },
  red:     { border: 'border-red-200',     icon: 'text-red-500',     value: 'text-red-600'     },
};

const SummaryCard = ({ icon: Icon, label, value, detail, color }) => {
  const c = SUMMARY_COLORS[color] || SUMMARY_COLORS.emerald;
  return (
    <div className={`p-4 bg-white border-2 rounded-xl ${c.border}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase"><Icon className={`w-3.5 h-3.5 ${c.icon}`}/>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${c.value}`}>{value}</p>
      {detail && <p className="text-xs text-gray-500">{detail}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Sección 1: Reporte de Citas / Recepciones ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const AppointmentsReportSection = () => {
  const [filters, setFilters] = useState(EMPTY_APPOINTMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);

  const { data: providersData } = useQuery({
    queryKey: ['providers-select'],
    queryFn: () => providerService.getAll({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const providers = providersData?.data || providersData?.providers || [];

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => { setFilters(EMPTY_APPOINTMENT_FILTERS); setAppliedFilters(null); };

  const { data: previewData, isFetching: previewLoading } = useQuery({
    queryKey: ['report-preview-appointments', appliedFilters],
    queryFn: () => reportService.getAppointmentsPreview(cleanParams(appliedFilters)),
    enabled: !!appliedFilters,
  });

  const downloadMutation = useMutation({
    mutationFn: () => reportService.downloadAppointmentsReport(cleanParams(filters)),
    onSuccess: () => showToast.success('Reporte descargado'),
    onError:   () => showToast.error('Error al generar el reporte'),
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const rows    = previewData?.rows    || [];
  const total   = previewData?.total   ?? 0;
  const showing = previewData?.showing ?? 0;
  const summary = previewData?.summary;

  return (
    <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <FileSpreadsheet className="w-5 h-5 text-emerald-600"/>
        <div>
          <h2 className="font-bold text-gray-900">Reporte de Citas y Recepciones</h2>
          <p className="text-xs text-gray-500">Incluye estado de cada cita, entrada, puntualidad, recepción, condiciones de la entrega y detalle por producto</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500"/>
          <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-500 hover:text-gray-700">
              <RotateCcw className="w-3 h-3"/>Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Calendar className="inline w-3.5 h-3.5 mr-1"/>Desde</label>
            <input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"/>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Calendar className="inline w-3.5 h-3.5 mr-1"/>Hasta</label>
            <input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"/>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Building2 className="inline w-3.5 h-3.5 mr-1"/>Proveedor</label>
            <select value={filters.provider_id} onChange={e => set('provider_id', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400">
              <option value="">Todos los proveedores</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Tag className="inline w-3.5 h-3.5 mr-1"/>Estado de la cita</label>
            <select value={filters.status} onChange={e => set('status', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Tag className="inline w-3.5 h-3.5 mr-1"/>Estado de recepción</label>
            <select value={filters.reception_status} onChange={e => set('reception_status', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400">
              {RECEPTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Timer className="inline w-3.5 h-3.5 mr-1"/>Puntualidad</label>
            <select value={filters.punctuality} onChange={e => set('punctuality', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400">
              {PUNCTUALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={() => setAppliedFilters({ ...filters })} loading={previewLoading} leftIcon={<Eye className="w-4 h-4"/>} variant="secondary">
            Vista previa
          </Button>
          <Button onClick={() => downloadMutation.mutate()} loading={downloadMutation.isPending} leftIcon={<Download className="w-4 h-4"/>}
            className="text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
            Descargar reporte Excel
          </Button>
        </div>

        {appliedFilters && (
          <div className="pt-2 space-y-4">
            {/* ✅ Indicadores del periodo filtrado (sobre todas las citas, no solo la vista previa) */}
            {!previewLoading && summary && total > 0 && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard icon={Timer} color="emerald" label="Entregas a tiempo"
                  value={summary.on_time_pct !== null ? `${summary.on_time_pct}%` : '—'}
                  detail={summary.entries > 0 ? `${summary.on_time} de ${summary.entries} con entrada confirmada` : 'Sin entradas confirmadas'}/>
                <SummaryCard icon={AlertCircle} color="amber" label="Con retraso"
                  value={summary.late}
                  detail={summary.avg_delay_minutes !== null ? `Retraso promedio: ${summary.avg_delay_minutes} min` : null}/>
                <SummaryCard icon={UserX} color="orange" label="No se presentó" value={summary.no_show}/>
                <SummaryCard icon={ClipboardCheck} color="red" label="Condiciones no cumplidas"
                  value={summary.conditions_with_failures}
                  detail={summary.conditions_evaluated > 0 ? `de ${summary.conditions_evaluated} recepciones evaluadas` : 'Sin recepciones evaluadas'}/>
              </div>
            )}

            {previewLoading ? (
              <div className="flex items-center justify-center py-10 border-2 border-gray-100 rounded-xl">
                <RefreshCw className="w-5 h-5 mr-2 text-gray-400 animate-spin"/>
                <p className="text-sm text-gray-500">Generando vista previa...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center border-2 border-gray-100 border-dashed rounded-xl">
                <AlertCircle className="w-8 h-8 mb-2 text-gray-300"/>
                <p className="text-sm text-gray-500">No hay citas que coincidan con estos filtros.</p>
              </div>
            ) : (
              <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">
                    Mostrando {showing} de {total} cita{total !== 1 ? 's' : ''}
                    {total > showing && ' — descarga el Excel para ver todo el detalle'}
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Fecha</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Hora</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Llegada</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Puntualidad</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Proveedor</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Tipo</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Estado</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Recepción</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Condiciones</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Ítems</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(r.date)}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.time}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.actual_arrival_time || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {r.arrived_on_time === true && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">A tiempo</span>}
                            {r.arrived_on_time === false && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">+{r.delay_minutes} min</span>}
                            {(r.arrived_on_time === null || r.arrived_on_time === undefined) && <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2 min-w-[160px]">
                            <p className="font-medium text-gray-800 truncate">{r.provider_name}</p>
                            {r.is_rescheduled && <span className="inline-flex items-center gap-1 text-[11px] text-purple-600"><RefreshCw className="w-3 h-3"/>Reagendada</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.type_label}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status_label}</span>
                            {r.has_missing_docs && <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-red-500"><AlertCircle className="w-3 h-3"/>Docs</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${RECEPTION_BADGE[r.reception_status] || 'bg-gray-100 text-gray-700'}`}>{r.reception_label}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {!r.conditions_evaluated
                              ? <span className="text-xs text-gray-400">—</span>
                              : r.conditions_failed > 0
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{r.conditions_failed} no cumple{r.conditions_failed > 1 ? 'n' : ''}</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700"><CheckCircle className="w-3 h-3"/>Cumple</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {r.items_total}
                            {r.items_not_delivered > 0 && <span className="ml-1 text-[11px] text-slate-500">({r.items_not_delivered} no entreg.)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 p-3 border border-emerald-200 rounded-xl bg-emerald-50">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-emerald-700">
            El Excel incluye tres hojas: <strong>"Citas"</strong> con el resumen de cada cita (entrada, puntualidad, recepción y condiciones de la entrega),
            <strong> "Detalle Productos"</strong> con cada ítem entregado, rechazado o no entregado,
            y <strong>"Desempeño por Proveedor"</strong> con puntualidad, inasistencias y condiciones no cumplidas de cada proveedor.
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Sección 2: Reporte de Cumplimiento Documental ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const ComplianceReportSection = () => {
  const [filters, setFilters] = useState({
    provider_id: '', provider_type_id: '', provider_status: '', compliance: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState(null);

  const { data: providersData } = useQuery({
    queryKey: ['providers-select'],
    queryFn: () => providerService.getAll({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const providers = providersData?.data || providersData?.providers || [];

  const { data: providerTypesData } = useQuery({
    queryKey: ['provider-types-select'],
    queryFn: () => api.get('/provider-types').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const providerTypes = providerTypesData?.provider_types || providerTypesData?.data || providerTypesData || [];

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => { setFilters({ provider_id: '', provider_type_id: '', provider_status: '', compliance: 'all' }); setAppliedFilters(null); };

  const { data: previewData, isFetching: previewLoading } = useQuery({
    queryKey: ['report-preview-compliance', appliedFilters],
    queryFn: () => reportService.getProvidersCompliancePreview(cleanParams(appliedFilters)),
    enabled: !!appliedFilters,
  });

  const downloadMutation = useMutation({
    mutationFn: () => reportService.downloadProvidersComplianceReport(cleanParams(filters)),
    onSuccess: () => showToast.success('Reporte descargado'),
    onError:   () => showToast.error('Error al generar el reporte'),
  });

  const hasActiveFilters = filters.provider_id !== '' || filters.provider_type_id !== '' || filters.provider_status !== '' || filters.compliance !== 'all';
  const rows    = previewData?.rows    || [];
  const total   = previewData?.total   ?? 0;
  const showing = previewData?.showing ?? 0;

  const complianceColor = (pct) => pct >= 100 ? 'text-teal-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const complianceIcon  = (pct) => pct >= 100 ? ShieldCheck : pct >= 60 ? ShieldAlert : ShieldX;

  return (
    <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <ShieldCheck className="w-5 h-5 text-indigo-600"/>
        <div>
          <h2 className="font-bold text-gray-900">Reporte de Cumplimiento Documental</h2>
          <p className="text-xs text-gray-500">Documentos requeridos vs. subidos, aprobados, pendientes y vencidos, por proveedor</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500"/>
          <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-500 hover:text-gray-700">
              <RotateCcw className="w-3 h-3"/>Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Building2 className="inline w-3.5 h-3.5 mr-1"/>Proveedor</label>
            <select value={filters.provider_id} onChange={e => set('provider_id', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400">
              <option value="">Todos los proveedores</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Tag className="inline w-3.5 h-3.5 mr-1"/>Tipo de proveedor</label>
            <select value={filters.provider_type_id} onChange={e => set('provider_type_id', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400">
              <option value="">Todos los tipos</option>
              {providerTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Tag className="inline w-3.5 h-3.5 mr-1"/>Estado del proveedor</label>
            <select value={filters.provider_status} onChange={e => set('provider_status', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400">
              {PROVIDER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><ShieldAlert className="inline w-3.5 h-3.5 mr-1"/>Cumplimiento</label>
            <select value={filters.compliance} onChange={e => set('compliance', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400">
              {COMPLIANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={() => setAppliedFilters({ ...filters })} loading={previewLoading} leftIcon={<Eye className="w-4 h-4"/>} variant="secondary">
            Vista previa
          </Button>
          <Button onClick={() => downloadMutation.mutate()} loading={downloadMutation.isPending} leftIcon={<Download className="w-4 h-4"/>}
            className="text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            Descargar reporte Excel
          </Button>
        </div>

        {appliedFilters && (
          <div className="pt-2">
            {previewLoading ? (
              <div className="flex items-center justify-center py-10 border-2 border-gray-100 rounded-xl">
                <RefreshCw className="w-5 h-5 mr-2 text-gray-400 animate-spin"/>
                <p className="text-sm text-gray-500">Generando vista previa...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center border-2 border-gray-100 border-dashed rounded-xl">
                <AlertCircle className="w-8 h-8 mb-2 text-gray-300"/>
                <p className="text-sm text-gray-500">No hay proveedores que coincidan con estos filtros.</p>
              </div>
            ) : (
              <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">
                    Mostrando {showing} de {total} proveedor{total !== 1 ? 'es' : ''}
                    {total > showing && ' — descarga el Excel para ver todo el detalle'}
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Proveedor</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase">Tipo</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Requeridos</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Aprobados</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Pendientes</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Faltantes</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Vencidos</th>
                        <th className="px-3 py-2 text-xs font-bold tracking-wide text-center text-gray-500 uppercase">Cumplimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map(r => {
                        const Icon = complianceIcon(r.compliance_pct);
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 min-w-[180px]">
                              <p className="font-medium text-gray-800 truncate">{r.business_name}</p>
                              <p className="font-mono text-xs text-gray-400">{r.rfc}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.provider_type}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{r.required_count}</td>
                            <td className="px-3 py-2 font-semibold text-center text-teal-600">{r.approved_count}</td>
                            <td className="px-3 py-2 font-semibold text-center text-amber-600">{r.pending_count}</td>
                            <td className="px-3 py-2 font-semibold text-center text-red-600">{r.missing_count}</td>
                            <td className="px-3 py-2 font-semibold text-center text-slate-600">{r.expired_count}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center gap-1 font-bold ${complianceColor(r.compliance_pct)}`}>
                                <Icon className="w-3.5 h-3.5"/>{r.compliance_pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 p-3 border border-indigo-200 rounded-xl bg-indigo-50">
          <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-indigo-700">
            El Excel incluye dos hojas: <strong>"Resumen Proveedores"</strong> con el % de cumplimiento de cada uno,
            y <strong>"Detalle Documentos"</strong> con cada documento requerido, si fue subido, su estado y vigencia.
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Página principal ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-6 border-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-emerald-500 to-teal-500">
          <FileSpreadsheet className="w-6 h-6 text-white"/>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-600">Descarga información de citas, recepciones y cumplimiento documental en Excel</p>
        </div>
      </div>

      <AppointmentsReportSection/>
      <ComplianceReportSection/>
    </div>
  );
};
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { nonConformityService } from '../../api/nonConformityService';
import { Button } from '../common/Button';
import { showToast } from '../../utils/toast';
import { NC_STATUS_STYLES } from './NcShared';
import { Download, Timer, CheckCircle, Clock, FileWarning, AlertTriangle, Filter, BarChart3 } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CURRENT_YEAR = new Date().getFullYear();
const inputCls = 'w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400';

const Kpi = ({ icon: Icon, label, value, detail, tone = 'primary' }) => {
  const tones = {
    primary: 'border-primary-200 text-primary-700',
    teal:    'border-teal-200 text-teal-600',
    amber:   'border-amber-200 text-amber-600',
    red:     'border-red-200 text-red-600',
    blue:    'border-blue-200 text-blue-600',
  };
  return (
    <div className={`p-4 bg-white border-2 rounded-xl ${tones[tone].split(' ')[0]}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase"><Icon className="w-3.5 h-3.5"/>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone].split(' ')[1]}`}>{value}</p>
      {detail && <p className="text-xs text-gray-500">{detail}</p>}
    </div>
  );
};

/** Barras horizontales simples (sin librería de gráficas) */
const BarList = ({ items, color = 'bg-primary-500' }) => {
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={i.name} className="grid grid-cols-[120px_1fr_32px] items-center gap-2">
          <p className="text-xs text-gray-700 truncate" title={i.name}>{i.name}</p>
          <div className="h-4 overflow-hidden bg-gray-100 rounded-full">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(i.count / max) * 100}%` }}/>
          </div>
          <p className="text-xs font-bold text-right text-gray-700">{i.count}</p>
        </div>
      ))}
    </div>
  );
};

/** Columnas por mes */
const MonthColumns = ({ months }) => {
  const max = Math.max(1, ...months.map(m => m.count));
  return (
    <div className="flex items-end h-40 gap-1.5">
      {months.map(m => (
        <div key={m.month} className="flex flex-col items-center justify-end flex-1 h-full gap-1">
          <span className="text-[10px] font-bold text-gray-600">{m.count || ''}</span>
          <div className="w-full rounded-t-md bg-primary-400" style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count ? 4 : 0 }}/>
          <span className="text-[10px] text-gray-500">{m.month}</span>
        </div>
      ))}
    </div>
  );
};

const pctLabel = (v) => (v === null || v === undefined ? '—' : `${v}%`);

export const NcIndicators = ({ providers = [] }) => {
  const [filters, setFilters] = useState({ year: String(CURRENT_YEAR), month: '', provider_id: '' });
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['non-conformities', 'stats', params],
    queryFn: () => nonConformityService.getStats(params),
  });

  const exportMutation = useMutation({
    mutationFn: () => nonConformityService.exportExcel(params),
    onSuccess: () => showToast.success('Excel descargado'),
    onError:   () => showToast.error('No se pudo generar el Excel'),
  });

  const s = data?.summary;
  const years = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="p-4 space-y-3 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500"/><h3 className="text-sm font-semibold text-gray-700">Periodo</h3>
          <Button size="sm" className="ml-auto text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            leftIcon={<Download className="w-4 h-4"/>} loading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            Descargar Excel
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select value={filters.year} onChange={e => set('year', e.target.value)} className={inputCls}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.month} onChange={e => set('month', e.target.value)} className={inputCls}>
            <option value="">Todo el año</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={filters.provider_id} onChange={e => set('provider_id', e.target.value)} className={inputCls}>
            <option value="">Todos los proveedores</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-gray-500">
          "A tiempo": respuesta enviada antes de su límite y cierre antes del límite de evidencias.
          Las que todavía están en plazo no cuentan en el porcentaje.
        </p>
      </div>

      {isLoading || !s ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 rounded-full border-t-primary-500 animate-spin"/></div>
      ) : s.total === 0 ? (
        <div className="py-12 text-center bg-white border-2 border-gray-200 rounded-xl">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-500">No hay No Conformidades en este periodo</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon={FileWarning} label="No Conformidades" value={s.total} detail={`${s.open} abiertas · ${s.closed} cerradas`}/>
            <Kpi icon={Timer} tone="teal" label="Respuesta a tiempo" value={pctLabel(s.response_on_time_pct)} detail={`${s.response_on_time} a tiempo · ${s.response_late} fuera de tiempo`}/>
            <Kpi icon={CheckCircle} tone="blue" label="Cierre a tiempo" value={pctLabel(s.close_on_time_pct)} detail={`${s.close_on_time} a tiempo · ${s.close_late} fuera de tiempo`}/>
            <Kpi icon={Clock} tone="amber" label="Días para responder" value={s.avg_response_days ?? '—'} detail="Promedio desde la emisión"/>
            <Kpi icon={Clock} tone="amber" label="Días para cerrar" value={s.avg_close_days ?? '—'} detail="Promedio desde la emisión"/>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
              <p className="mb-3 text-sm font-bold text-gray-800">Por tipo de desviación</p>
              <BarList items={data.by_type}/>
            </div>
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
              <p className="mb-3 text-sm font-bold text-gray-800">Por estado</p>
              <BarList items={Object.entries(data.by_status).map(([name, count]) => ({ name, count }))} color="bg-amber-400"/>
            </div>
          </div>

          {!filters.month && (
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
              <p className="mb-3 text-sm font-bold text-gray-800">Por mes · {data.year}</p>
              <MonthColumns months={data.by_month}/>
            </div>
          )}

          <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
            <p className="px-4 py-3 text-sm font-bold text-gray-800 border-b border-gray-200 bg-gray-50">Por proveedor</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    {['Proveedor', 'NC', 'Resp. a tiempo', 'Resp. fuera', '% a tiempo', 'Cerradas a tiempo', 'Cerradas fuera', 'Abiertas', 'Prom. días resp.'].map(h => (
                      <th key={h} className="px-3 py-2 text-xs font-bold tracking-wide text-left text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.by_provider.map(p => (
                    <tr key={p.provider_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800 min-w-[180px]">{p.provider_name}<p className="font-mono text-[11px] text-gray-400">{p.rfc}</p></td>
                      <td className="px-3 py-2 font-bold text-gray-800">{p.total}</td>
                      <td className="px-3 py-2 font-semibold text-teal-600">{p.response_on_time}</td>
                      <td className="px-3 py-2 font-semibold text-red-600">{p.response_late}</td>
                      <td className="px-3 py-2 font-bold text-gray-700">{pctLabel(p.response_on_time_pct)}</td>
                      <td className="px-3 py-2 text-teal-600">{p.closed_on_time}</td>
                      <td className="px-3 py-2 text-red-600">{p.closed_late}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {p.open}
                        {p.open_overdue > 0 && <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600"><AlertTriangle className="w-3 h-3"/>{p.open_overdue} vencida{p.open_overdue > 1 ? 's' : ''}</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{p.avg_response_days ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
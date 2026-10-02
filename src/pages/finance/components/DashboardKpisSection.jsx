import React from 'react';
import { DollarSign, AlertOctagon, TrendingUp, Users } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

export const DashboardKpisSection = ({ kpis, onSelectProvider }) => {
  if (!kpis) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-1 text-gray-500">
            <DollarSign className="w-4 h-4" />
            <p className="text-xs font-semibold tracking-wide uppercase">Total por cobrar</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatMoney(kpis.total_pending)}</p>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-1 text-red-500">
            <AlertOctagon className="w-4 h-4" />
            <p className="text-xs font-semibold tracking-wide uppercase">Facturas vencidas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.overdue_count}</p>
          <p className="text-xs text-gray-500">{formatMoney(kpis.overdue_amount)}</p>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-1 text-gray-500">
            <TrendingUp className="w-4 h-4" />
            <p className="text-xs font-semibold tracking-wide uppercase">Facturas totales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.invoices_count}</p>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-1 text-gray-500">
            <Users className="w-4 h-4" />
            <p className="text-xs font-semibold tracking-wide uppercase">Proveedores vinculados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.providers_linked_count}</p>
        </div>
      </div>

      {kpis.top_providers?.length > 0 && (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Top 5 proveedores con mayor saldo pendiente</p>
          </div>
          <div className="divide-y divide-gray-100">
            {kpis.top_providers.map((p, idx) => (
              <button
                key={p.provider_id}
                onClick={() => onSelectProvider({ id: p.provider_id, business_name: p.provider_name })}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary-100 text-primary-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{p.provider_name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatMoney(p.pending_amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Receipt } from 'lucide-react';
import { formatMoney, formatDate } from '../../../utils/formatters';

export const InvoiceTimelineContent = ({ invoiceId, fetchTimeline, onNavigate }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-timeline-finance', invoiceId],
    queryFn: () => fetchTimeline(invoiceId),
  });

  if (isLoading) {
    return <div className="py-6 text-sm text-center text-gray-400">Cargando historial...</div>;
  }

  const block = data?.payment_block;

  const events = [
    ...(data?.applied_payments || []).map((p) => ({
      type: 'payment', date: p.tran_date, label: `Pago ${p.tran_id}`, amount: p.amount, id: p.id,
    })),
    ...(data?.applied_credit_memos || []).map((c) => ({
      type: 'credit_memo', date: c.tran_date, label: `Nota de crédito ${c.tran_id}`, amount: c.amount, id: c.id,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="py-3">
      {block?.blocked && (
        <div className="p-3 mb-4 text-sm border rounded-xl text-amber-800 border-amber-200 bg-amber-50">
          <p className="font-semibold">⚠️ Se detiene el pago de la factura porque tiene registros pendientes</p>
          <ul className="mt-1.5 ml-4 list-disc">
            {block.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {events.length === 0 ? (
        <div className="py-6 text-sm text-center text-gray-400">Sin pagos ni notas de crédito aplicados a esta factura todavía</div>
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Historial de aplicaciones</p>
          <div className="space-y-0">
            {events.map((ev, idx) => (
              <div
                key={`${ev.type}-${ev.id}`}
                className="flex items-start gap-3 px-2 py-1 -mx-2 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => onNavigate(ev.type === 'payment' ? 'payments' : 'credit_memos', ev.id)}
              >
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                    ev.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {ev.type === 'payment' ? <CreditCard className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  </div>
                  {idx < events.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1 min-h-[16px]" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 hover:underline">{ev.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(ev.amount)}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(ev.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
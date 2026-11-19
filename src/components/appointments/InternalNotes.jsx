import React from 'react';
import { Lock, ShoppingCart, Shield, LogOut, FlaskConical } from 'lucide-react';

/**
 * Observaciones internas de una cita (no las ve el proveedor).
 *  - compras:   lo que escribió Compras al agendar (lo ven Seguridad e Ingeniero de alimentos)
 *  - seguridad: notas de Seguridad al dar entrada y al registrar la salida (las ve Compras)
 *  - ingeniero: observaciones internas de la recepción (generales y por producto)
 */
export const InternalNotes = ({ appointment, show = ['compras'], compact = false }) => {
  const a = appointment || {};
  const blocks = [];

  if (show.includes('compras') && a.notes) {
    blocks.push({ key: 'compras', Icon: ShoppingCart, label: 'Observaciones de Compras', text: a.notes,
      cls: 'border-indigo-200 bg-indigo-50 text-indigo-900', labelCls: 'text-indigo-700' });
  }
  if (show.includes('seguridad') && a.entry_notes) {
    blocks.push({ key: 'entrada', Icon: Shield, label: 'Seguridad · al dar entrada', text: a.entry_notes,
      cls: 'border-amber-200 bg-amber-50 text-amber-900', labelCls: 'text-amber-700' });
  }
  if (show.includes('seguridad') && a.exit_notes) {
    blocks.push({ key: 'salida', Icon: LogOut, label: 'Seguridad · al registrar salida', text: a.exit_notes,
      cls: 'border-slate-200 bg-slate-50 text-slate-800', labelCls: 'text-slate-600' });
  }
  if (show.includes('ingeniero')) {
    const itemNotes = (a.items || []).filter(i => i.reception_notes);
    if (a.reception_notes || itemNotes.length > 0) {
      blocks.push({ key: 'ingeniero', Icon: FlaskConical, label: 'Ingeniero de alimentos · recepción',
        text: [
          a.reception_notes,
          ...itemNotes.map(i => `• ${i.product_name}: ${i.reception_notes}`),
        ].filter(Boolean).join('\n'),
        cls: 'border-teal-200 bg-teal-50 text-teal-900', labelCls: 'text-teal-700' });
    }
  }
  if (blocks.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-1.5 space-y-1">
        {blocks.map(b => (
          <p key={b.key} className={`flex items-start gap-1 text-xs ${b.labelCls}`}>
            <b.Icon className="w-3 h-3 mt-0.5 flex-shrink-0"/>
            <span><span className="font-semibold">{b.label}:</span> <span className="italic">{b.text}</span></span>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map(b => (
        <div key={b.key} className={`p-3 border rounded-xl ${b.cls}`}>
          <p className={`flex items-center gap-1 mb-1 text-xs font-semibold ${b.labelCls}`}>
            <b.Icon className="w-3.5 h-3.5"/>{b.label}
            <span className="inline-flex items-center gap-0.5 ml-auto font-normal opacity-70"><Lock className="w-3 h-3"/>Interna</span>
          </p>
          <p className="text-sm whitespace-pre-line">{b.text}</p>
        </div>
      ))}
    </div>
  );
};

/** Minutos → "1 h 25 min" */
export const formatStay = (mins) => {
  if (mins === null || mins === undefined) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};
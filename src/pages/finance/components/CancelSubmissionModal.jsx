import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';

export const CancelSubmissionModal = ({ submission, onClose, onSubmit, loading }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      alert('Escribe el motivo de la cancelación');
      return;
    }
    onSubmit({ status: 'cancelled', review_notes: reason });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md p-6 bg-white shadow-elevated rounded-2xl">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Cancelar factura</h2>
        <p className="mb-4 text-sm text-gray-500">
          {submission.provider?.business_name} — {[submission.serie, submission.folio].filter(Boolean).join(' ')}
        </p>

        <div className="p-3 mb-4 text-sm border text-amber-800 border-amber-200 bg-amber-50 rounded-xl">
          Úsalo cuando el CFDI fue cancelado ante el SAT o el registro en NetSuite se recreó por error.
          El proveedor será notificado y, si aplica, deberá subir la versión corregida como una nueva factura.
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700">
            Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué se cancela..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={onClose} className="flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200">
            Cerrar
          </Button>
          <Button type="button" loading={loading} onClick={handleConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
            Confirmar cancelación
          </Button>
        </div>
      </div>
    </div>
  );
};
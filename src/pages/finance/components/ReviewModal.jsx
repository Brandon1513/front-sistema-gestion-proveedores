import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { TYPE_LABELS } from '../../../utils/statusMaps';

export const ReviewModal = ({ request, onClose, onSubmit, loading }) => {
  const [status, setStatus] = useState('approved');
  const [notes, setNotes] = useState('');

  const options = [
    { value: 'in_review', label: 'Marcar en revisión' },
    { value: 'approved', label: 'Aprobar' },
    { value: 'rejected', label: 'Rechazar' },
    { value: 'sent_to_netsuite', label: 'Ya se envió a NetSuite' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg p-6 bg-white shadow-elevated rounded-2xl">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Revisar solicitud</h2>
        <p className="mb-4 text-sm text-gray-500">
          {request.provider?.business_name} — {TYPE_LABELS[request.type] || request.type}
        </p>

        <p className="p-3 mb-4 text-sm text-gray-700 bg-gray-50 rounded-xl">{request.description}</p>

        {request.provider_response_file_path && (
          <div className="p-3 mb-4 text-sm text-green-700 border border-green-200 bg-green-50 rounded-xl">
            ✓ El proveedor ya subió su CFDI — puedes descargarlo desde la tabla antes de decidir.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Nuevo estatus</label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors ${
                    status === opt.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios sobre la decisión..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} className="flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </Button>
            <Button
              type="button"
              loading={loading}
              onClick={() => onSubmit({ status, review_notes: notes })}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
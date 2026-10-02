import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { formatMoney } from '../../../utils/formatters';
import { accountStatementService } from '../../../api/accountStatementService';

export const ReviewSubmissionModal = ({ submission, onClose, onSubmit, loading }) => {
  const [status, setStatus] = useState('captured');
  const [notes, setNotes] = useState('');

  const options = [
    { value: 'captured', label: 'Marcar como capturada' },
    { value: 'rejected', label: 'Rechazar' },
  ];

  const handleConfirm = () => {
    if (status === 'rejected' && !notes.trim()) {
      alert('Escribe el motivo del rechazo');
      return;
    }
    onSubmit({ status, review_notes: notes || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg p-6 bg-white shadow-elevated rounded-2xl">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Revisar factura</h2>
        <p className="mb-4 text-sm text-gray-500">
          {submission.provider?.business_name} — {[submission.serie, submission.folio].filter(Boolean).join(' ')}
        </p>

        <div className="p-3 mb-4 text-sm text-gray-700 bg-gray-50 rounded-xl">
          <p><strong>Total:</strong> {formatMoney(submission.total)}</p>
          <p><strong>Método de pago:</strong> {submission.payment_method || '—'}</p>
          <p className="mt-1 text-xs text-gray-500 break-all"><strong>UUID:</strong> {submission.uuid}</p>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => accountStatementService.downloadSubmissionFile(submission.id, 'pdf', `factura-${submission.folio || submission.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-xl text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100"
          >
            <Download className="w-4 h-4" />
            Ver PDF
          </button>
          <button
            type="button"
            onClick={() => accountStatementService.downloadSubmissionFile(submission.id, 'xml', `factura-${submission.folio || submission.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-xl text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100"
          >
            <Download className="w-4 h-4" />
            Ver XML
          </button>
        </div>

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
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Notas {status === 'rejected' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={status === 'rejected' ? 'Explica por qué se rechaza...' : 'Comentarios (opcional)...'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} className="flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </Button>
            <Button type="button" loading={loading} onClick={handleConfirm} className="flex-1">
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
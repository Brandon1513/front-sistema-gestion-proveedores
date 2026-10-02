import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { formatMoney } from '../../../utils/formatters';
import { accountStatementService } from '../../../api/accountStatementService';

export const CreateCreditNoteModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const [providerQuery, setProviderQuery] = useState('');
  const [providerResults, setProviderResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [providerInvoices, setProviderInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [form, setForm] = useState({
    type: 'faltante',
    description: '',
    amount_requested: '',
    related_invoice_id: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProviderQueryChange = (value) => {
    setProviderQuery(value);
    setShowDropdown(true);
    setSelectedProvider(null);
    setProviderInvoices([]);
    setForm((f) => ({ ...f, related_invoice_id: '' }));

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < 2) {
        setProviderResults([]);
        return;
      }
      const results = await accountStatementService.searchProviders(value.trim());
      setProviderResults(results);
    }, 300);
  };

  const selectProvider = async (provider) => {
    setSelectedProvider(provider);
    setProviderQuery(provider.business_name);
    setShowDropdown(false);
    setLoadingInvoices(true);
    try {
      const statement = await accountStatementService.getFinanceAccountStatement({ provider_id: provider.id });
      setProviderInvoices(statement?.invoices?.data || []);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (formData) => accountStatementService.createCreditNoteRequest(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-credit-note-requests'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al crear la solicitud'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedProvider) {
      setError('Selecciona un proveedor');
      return;
    }

    const formData = new FormData();
    formData.append('provider_id', selectedProvider.id);
    formData.append('type', form.type);
    formData.append('description', form.description);
    if (form.amount_requested) formData.append('amount_requested', form.amount_requested);
    if (form.related_invoice_id) formData.append('related_invoice_id', form.related_invoice_id);
    if (file) formData.append('file', file);

    mutation.mutate(formData);
  };

  const typeOptions = [
    { value: 'faltante', label: 'Faltante' },
    { value: 'devolucion', label: 'Devolución' },
    { value: 'rechazo', label: 'Rechazo' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg p-6 overflow-visible bg-white shadow-elevated rounded-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Nueva solicitud de nota de crédito</h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Proveedor</label>
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                value={providerQuery}
                onChange={(e) => handleProviderQueryChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Escribe el nombre del proveedor..."
                className="w-full py-2.5 pl-9 pr-9 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {providerQuery && (
                <button
                  type="button"
                  onClick={() => { setProviderQuery(''); setSelectedProvider(null); setProviderResults([]); setProviderInvoices([]); }}
                  className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showDropdown && providerResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 overflow-hidden bg-white border border-gray-200 shadow-lg rounded-xl">
                {providerResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProvider(p)}
                    className="flex flex-col w-full px-4 py-2.5 text-left hover:bg-primary-50 border-b border-gray-50 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-gray-900">{p.business_name}</span>
                    <span className="text-xs text-gray-500">RFC: {p.rfc}</span>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && providerQuery.trim().length >= 2 && providerResults.length === 0 && (
              <div className="absolute z-20 w-full p-3 mt-1 text-sm text-center text-gray-400 bg-white border border-gray-200 shadow-lg rounded-xl">
                Sin proveedores vinculados a NetSuite con ese nombre
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Motivo</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((t) => (
                <button
                  type="button" key={t.value}
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors ${
                    form.type === t.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {selectedProvider && (
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Factura relacionada (opcional)</label>
              {loadingInvoices ? (
                <p className="text-xs text-gray-400">Cargando facturas del proveedor...</p>
              ) : (
                <select
                  value={form.related_invoice_id}
                  onChange={(e) => setForm({ ...form, related_invoice_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Sin factura relacionada</option>
                  {providerInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.tran_id} — {formatMoney(inv.amount)}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              required rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el motivo de la solicitud..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <Input
            label="Monto solicitado (opcional)" type="number" step="0.01"
            value={form.amount_requested}
            onChange={(e) => setForm({ ...form, amount_requested: e.target.value })}
            placeholder="0.00"
          />

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Evidencia (opcional — PDF o imagen, máx. 10MB)
            </label>
            <input
              type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm file:font-semibold"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} className="flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              Crear solicitud
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
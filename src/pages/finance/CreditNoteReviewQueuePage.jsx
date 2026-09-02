import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountStatementService } from '../../api/accountStatementService';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Clock, CheckCircle, XCircle, AlertCircle, Download, Send, Plus, Search, X } from 'lucide-react';

const STATUS_TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'in_review', label: 'En revisión' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'sent_to_netsuite', label: 'Enviadas a NetSuite' },
];

const TYPE_LABELS = {
  faltante: 'Producto Faltante',
  devolucion: 'Devolución',
  rechazo: 'Rechazo',
};

const statusInfo = {
  pending: { label: 'Pendiente', variant: 'pending', icon: Clock },
  in_review: { label: 'En revisión', variant: 'info', icon: AlertCircle },
  approved: { label: 'Aprobada', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazada', variant: 'rejected', icon: XCircle },
  sent_to_netsuite: { label: 'Enviada a NetSuite', variant: 'success', icon: Send },
};

const formatMoney = (value) =>
  value ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value) : '—';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : '—');

export const CreditNoteReviewQueuePage = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['finance-credit-note-requests', statusFilter],
    queryFn: () => accountStatementService.getCreditNoteRequests({ status: statusFilter }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }) => accountStatementService.reviewCreditNoteRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-credit-note-requests'] });
      setSelected(null);
    },
  });

  const requests = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Nota de Crédito</h1>
          <p className="text-sm text-gray-600">Registra y da seguimiento a las notas de crédito de proveedores</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva solicitud
        </Button>
      </div>

      <div className="flex gap-1 p-1 overflow-x-auto bg-gray-100 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No hay solicitudes en este estatus</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Proveedor', 'Tipo', 'Descripción', 'Monto', 'Factura', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold tracking-wide text-left text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => {
                  const info = statusInfo[req.status] || statusInfo.pending;
                  const StatusIcon = info.icon;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{req.provider?.business_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{TYPE_LABELS[req.type] || req.type}</td>
                      <td className="max-w-xs px-4 py-3 text-sm text-gray-600 truncate">{req.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatMoney(req.amount_requested)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.related_invoice?.tran_id || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={info.variant}>
                          <StatusIcon className="inline w-3 h-3 mr-1" />
                          {info.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.file_path && (
                            <button
                              onClick={() => accountStatementService.downloadCreditNoteFile(req.id, req.tran_id || 'solicitud')}
                              className="text-gray-500 hover:text-primary-600"
                              title="Descargar evidencia"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(req)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
                          >
                            Revisar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ReviewModal
          request={selected}
          onClose={() => setSelected(null)}
          onSubmit={(payload) => reviewMutation.mutate({ id: selected.id, payload })}
          loading={reviewMutation.isPending}
        />
      )}

      {showCreateModal && (
        <CreateCreditNoteModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

const ReviewModal = ({ request, onClose, onSubmit, loading }) => {
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

const CreateCreditNoteModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Búsqueda de proveedor ──
  const [providerQuery, setProviderQuery] = useState('');
  const [providerResults, setProviderResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // ── Facturas del proveedor elegido ──
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
          {/* Búsqueda de proveedor */}
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

          {/* Tipo */}
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

          {/* Factura relacionada — depende del proveedor elegido */}
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
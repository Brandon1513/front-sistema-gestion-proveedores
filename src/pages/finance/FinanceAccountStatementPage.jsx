import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountStatementService } from '../../api/accountStatementService';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  FileText, Receipt, CreditCard, Search, Download, X, AlertTriangle,
  Clock, CheckCircle, XCircle, AlertCircle, Send, Plus,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, 
  DollarSign, TrendingUp, Users, AlertOctagon, FileSpreadsheet
} from 'lucide-react';

const TABS = [
  { id: 'invoices', label: 'Facturas', icon: FileText },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'credit_memos', label: 'Notas de Crédito (NetSuite)', icon: Receipt },
  { id: 'credit_note_requests', label: 'Solicitudes de Nota de Crédito', icon: Send },
];

const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estatus' },
  { value: 'pending', label: 'Solo pendientes de pago' },
  { value: 'paid', label: 'Solo pagadas' },
];

const REQUEST_STATUS_TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'in_review', label: 'En revisión' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'sent_to_netsuite', label: 'Enviadas a NetSuite' },
];

const TYPE_LABELS = {
  faltante: 'Faltante',
  devolucion: 'Devolución',
  rechazo: 'Rechazo',
};

const requestStatusInfo = {
  pending: { label: 'Pendiente', variant: 'pending', icon: Clock },
  in_review: { label: 'En revisión', variant: 'info', icon: AlertCircle },
  approved: { label: 'Aprobada', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazada', variant: 'rejected', icon: XCircle },
  sent_to_netsuite: { label: 'Enviada a NetSuite', variant: 'success', icon: Send },
};

const invoiceStatusVariant = (status) => {
  if (!status) return 'inactive';
  const s = status.toLowerCase();
  if (s.includes('pagado')) return 'success';
  if (s.includes('parcial')) return 'warning';
  if (s.includes('abierto') || s.includes('open')) return 'info';
  return 'inactive';
};

const formatMoney = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : '—');

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const FinanceAccountStatementPage = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [downloadingId, setDownloadingId] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Cuando navegas desde el timeline de una factura hacia un pago/nota,
  // o desde un pago/nota hacia su factura, esa pestaña se filtra a solo
  // ese registro.
  const [focusFilter, setFocusFilter] = useState(null); // { tab, id }

  // ── Búsqueda de proveedor por nombre (autocomplete) ──
  const [providerQuery, setProviderQuery] = useState('');
  const [providerResults, setProviderResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);


  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
        await accountStatementService.exportFinanceAccountStatement(selectedProvider?.id);
    } catch (err) {
        alert('No se pudo generar el archivo. Intenta de nuevo.');
    } finally {
        setExportingExcel(false);
    }
    };

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

  const selectProvider = (provider) => {
    setSelectedProvider(provider);
    setProviderQuery(provider.business_name);
    setShowDropdown(false);
  };

  const clearProvider = () => {
    setSelectedProvider(null);
    setProviderQuery('');
    setProviderResults([]);
  };

  // ── Filtros de facturas/pagos/notas de crédito NetSuite ──
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['finance-account-statement', selectedProvider?.id],
    queryFn: () => accountStatementService.getFinanceAccountStatement(
      selectedProvider ? { provider_id: selectedProvider.id } : {}
    ),
  });

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setInvoiceStatusFilter('');
  };

  const hasActiveFilters = search || dateFrom || dateTo || amountMin || amountMax || invoiceStatusFilter;

  const applyCommonFilters = (rows, dateField) => {
    if (!rows) return [];
    return rows.filter((row) => {
      if (search && !String(row.tran_id || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const rowDate = row[dateField] ? new Date(row[dateField]) : null;
      if (dateFrom && rowDate && rowDate < new Date(dateFrom)) return false;
      if (dateTo && rowDate && rowDate > new Date(dateTo)) return false;

      const amount = parseFloat(row.amount || 0);
      if (amountMin && amount < parseFloat(amountMin)) return false;
      if (amountMax && amount > parseFloat(amountMax)) return false;

      return true;
    });
  };

  const filteredInvoices = useMemo(() => {
    if (focusFilter?.tab === 'invoices') {
      return (data?.invoices?.data || []).filter((inv) => inv.id === focusFilter.id);
    }
    let rows = applyCommonFilters(data?.invoices?.data, 'tran_date');
    if (invoiceStatusFilter === 'paid') {
      rows = rows.filter((inv) => (inv.status || '').toLowerCase().includes('pagado'));
    } else if (invoiceStatusFilter === 'pending') {
      rows = rows.filter((inv) => !(inv.status || '').toLowerCase().includes('pagado'));
    }
    return rows;
  }, [data?.invoices, search, dateFrom, dateTo, amountMin, amountMax, invoiceStatusFilter, focusFilter]);

  const filteredPayments = useMemo(() => {
    if (focusFilter?.tab === 'payments') {
      return (data?.payments?.data || []).filter((p) => p.id === focusFilter.id);
    }
    return applyCommonFilters(data?.payments?.data, 'tran_date');
  }, [data?.payments, search, dateFrom, dateTo, amountMin, amountMax, focusFilter]);

  const filteredCreditMemos = useMemo(() => {
    if (focusFilter?.tab === 'credit_memos') {
      return (data?.credit_memos?.data || []).filter((c) => c.id === focusFilter.id);
    }
    return applyCommonFilters(data?.credit_memos?.data, 'tran_date');
  }, [data?.credit_memos, search, dateFrom, dateTo, amountMin, amountMax, focusFilter]);

  const handleDownloadNetSuiteFile = async (type, id, tranId) => {
    const key = `${type}-${id}`;
    setDownloadingId(key);
    try {
      await accountStatementService.downloadFinanceNetSuiteFile(type, id, tranId || 'documento');
    } catch (err) {
      alert('No se pudo descargar el archivo. Intenta de nuevo.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Navegación cruzada entre pestañas ──
  const navigateToRecord = (tab, id) => {
    setActiveTab(tab);
    setFocusFilter({ tab, id });
  };

  const clearFocusFilter = () => setFocusFilter(null);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setFocusFilter(null);
  };

  const goToInvoice = (invoice) => {
    setActiveTab('invoices');
    setFocusFilter({ tab: 'invoices', id: invoice.id });
    setExpandedInvoiceId(invoice.id);
  };

  const handleViewInvoiceFromPayment = async (paymentId, e) => {
    e.stopPropagation();
    const { invoices } = await accountStatementService.getPaymentRelatedInvoicesFinance(paymentId);
    if (invoices?.[0]) goToInvoice(invoices[0]);
    else alert('No se encontró una factura relacionada.');
  };

  const handleViewInvoiceFromCreditMemo = async (creditMemoId, e) => {
    e.stopPropagation();
    const { invoices } = await accountStatementService.getCreditMemoRelatedInvoicesFinance(creditMemoId);
    if (invoices?.[0]) goToInvoice(invoices[0]);
    else alert('No se encontró una factura relacionada.');
  };

  // ── Estado de la pestaña de Solicitudes de Nota de Crédito ──
  const [requestStatusFilter, setRequestStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['finance-credit-note-requests', requestStatusFilter],
    queryFn: () => accountStatementService.getCreditNoteRequests({ status: requestStatusFilter }),
    enabled: activeTab === 'credit_note_requests',
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }) => accountStatementService.reviewCreditNoteRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-credit-note-requests'] });
      setSelectedRequest(null);
    },
  });

  const creditNoteRequests = requestsData?.data || [];

  // ── Definición de columnas por pestaña ──
  const invoiceColumns = [
    { key: 'expand', label: '', sortable: false,
      render: (r) => (
        expandedInvoiceId === r.id
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
      ) },
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'tran_id', label: 'Folio', sortable: true, accessor: (r) => r.tran_id || '',
      render: (r) => <span className="text-sm font-medium text-gray-900">{r.tran_id}</span> },
    { key: 'tran_date', label: 'Fecha', sortable: true, accessor: (r) => r.tran_date || '',
      render: (r) => <span className="text-sm text-gray-600">{formatDate(r.tran_date)}</span> },
    { key: 'due_date', label: 'Vencimiento', sortable: true, accessor: (r) => r.due_date || '',
      render: (r) => {
        const daysLeft = daysUntil(r.due_date);
        const isPaid = (r.status || '').toLowerCase().includes('pagado');
        const showWarning = !isPaid && daysLeft !== null && daysLeft <= 7;
        return (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            {formatDate(r.due_date)}
            {showWarning && (
              <span title={daysLeft < 0 ? 'Vencida' : `Vence en ${daysLeft} días`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${daysLeft < 0 ? 'text-red-500' : 'text-amber-500'}`} />
              </span>
            )}
          </div>
        );
      } },
    { key: 'amount', label: 'Monto', sortable: true, accessor: (r) => parseFloat(r.amount || 0),
      render: (r) => <span className="text-sm font-semibold text-gray-900">{formatMoney(r.amount)}</span> },
    { key: 'status', label: 'Status', sortable: true, accessor: (r) => r.status || '',
      render: (r) => <Badge variant={invoiceStatusVariant(r.status)}>{r.status || '—'}</Badge> },
    { key: 'pdf', label: 'PDF', sortable: false,
      render: (r) => r.pdf_file_id ? (
        <DownloadButton
          loading={downloadingId === `invoice-${r.id}`}
          onClick={() => handleDownloadNetSuiteFile('invoice', r.id, r.tran_id)}
        />
      ) : '—' },
  ];

  const paymentColumns = [
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'tran_id', label: 'Folio', sortable: true, accessor: (r) => r.tran_id || '',
      render: (r) => <span className="text-sm font-medium text-gray-900">{r.tran_id}</span> },
    { key: 'tran_date', label: 'Fecha', sortable: true, accessor: (r) => r.tran_date || '',
      render: (r) => <span className="text-sm text-gray-600">{formatDate(r.tran_date)}</span> },
    { key: 'amount', label: 'Monto', sortable: true, accessor: (r) => parseFloat(r.amount || 0),
      render: (r) => <span className="text-sm font-semibold text-gray-900">{formatMoney(r.amount)}</span> },
    { key: 'receipt', label: 'Comprobante', sortable: false,
      render: (r) => r.receipt_file_id ? (
        <DownloadButton
          loading={downloadingId === `payment-${r.id}`}
          onClick={() => handleDownloadNetSuiteFile('payment', r.id, r.tran_id)}
        />
      ) : '—' },
    { key: 'related_invoice', label: 'Factura', sortable: false,
      render: (r) => (
        <button
          onClick={(e) => handleViewInvoiceFromPayment(r.id, e)}
          className="text-xs font-semibold text-primary-600 hover:underline"
        >
          Ver factura
        </button>
      ) },
  ];

  const creditMemoColumns = [
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'tran_id', label: 'Folio', sortable: true, accessor: (r) => r.tran_id || '',
      render: (r) => <span className="text-sm font-medium text-gray-900">{r.tran_id}</span> },
    { key: 'tran_date', label: 'Fecha', sortable: true, accessor: (r) => r.tran_date || '',
      render: (r) => <span className="text-sm text-gray-600">{formatDate(r.tran_date)}</span> },
    { key: 'amount', label: 'Monto', sortable: true, accessor: (r) => parseFloat(r.amount || 0),
      render: (r) => <span className="text-sm font-semibold text-gray-900">{formatMoney(r.amount)}</span> },
    { key: 'amount_remaining', label: 'Saldo disponible', sortable: true, accessor: (r) => parseFloat(r.amount_remaining || 0),
      render: (r) => <span className="text-sm text-gray-600">{formatMoney(r.amount_remaining)}</span> },
    { key: 'related_invoice', label: 'Factura', sortable: false,
      render: (r) => (
        <button
          onClick={(e) => handleViewInvoiceFromCreditMemo(r.id, e)}
          className="text-xs font-semibold text-primary-600 hover:underline"
        >
          Ver factura
        </button>
      ) },
  ];

  const requestColumns = [
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'type', label: 'Tipo', sortable: false,
      render: (r) => <span className="text-sm text-gray-600">{TYPE_LABELS[r.type] || r.type}</span> },
    { key: 'description', label: 'Descripción', sortable: false,
      render: (r) => <span className="block max-w-xs text-sm text-gray-600 truncate">{r.description}</span> },
    { key: 'amount_requested', label: 'Monto', sortable: true, accessor: (r) => parseFloat(r.amount_requested || 0),
      render: (r) => <span className="text-sm text-gray-900">{r.amount_requested ? formatMoney(r.amount_requested) : '—'}</span> },
    { key: 'invoice', label: 'Factura', sortable: false,
      render: (r) => <span className="text-sm text-gray-600">{r.related_invoice?.tran_id || '—'}</span> },
    { key: 'status', label: 'Status', sortable: false,
      render: (r) => {
        const info = requestStatusInfo[r.status] || requestStatusInfo.pending;
        const StatusIcon = info.icon;
        return (
          <Badge variant={info.variant}>
            <StatusIcon className="inline w-3 h-3 mr-1" />
            {info.label}
          </Badge>
        );
      } },
    { key: 'actions', label: '', sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.file_path && (
            <button
              onClick={(e) => { e.stopPropagation(); accountStatementService.downloadCreditNoteFile(r.id, r.tran_id || 'solicitud'); }}
              className="text-gray-500 hover:text-primary-600"
              title="Descargar evidencia que subiste"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {r.provider_response_file_path && (
            <button
              onClick={(e) => { e.stopPropagation(); accountStatementService.downloadProviderResponseFile(r.id, `cfdi-${r.provider?.business_name}`); }}
              className="flex items-center gap-1 text-green-600 hover:text-green-800"
              title="Descargar CFDI subido por el proveedor"
            >
              <Download className="w-4 h-4" />
              <CheckCircle className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedRequest(r); }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
          >
            Revisar
          </button>
        </div>
      ) },
  ];

  const focusedFolio = useMemo(() => {
    if (!focusFilter) return null;
    if (focusFilter.tab === 'invoices') return data?.invoices?.data?.find((i) => i.id === focusFilter.id)?.tran_id;
    if (focusFilter.tab === 'payments') return data?.payments?.data?.find((p) => p.id === focusFilter.id)?.tran_id;
    if (focusFilter.tab === 'credit_memos') return data?.credit_memos?.data?.find((c) => c.id === focusFilter.id)?.tran_id;
    return null;
  }, [focusFilter, data]);

  const { data: kpis } = useQuery({
  queryKey: ['finance-dashboard-kpis'],
  queryFn: accountStatementService.getFinanceDashboardKpis,
});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta — Proveedores</h1>
        <p className="text-sm text-gray-600">Consulta facturas, pagos, notas de crédito y gestiona solicitudes</p>
      </div>
      {activeTab !== 'credit_note_requests' && (
        <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-primary hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {exportingExcel ? (
            <>
                <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                Generando...
            </>
            ) : (
            <>
                <FileSpreadsheet className="w-4 h-4" />
                Exportar a Excel
            </>
            )}
        </button>
        )}

      <DashboardKpisSection kpis={kpis} onSelectProvider={selectProvider} />

      {/* Búsqueda de proveedor — aplica a las primeras 3 pestañas */}
      {activeTab !== 'credit_note_requests' && (
        <div className="p-6 overflow-visible bg-white border border-gray-200 rounded-2xl">
          <div className="relative" ref={dropdownRef}>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Buscar proveedor</label>
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
              {(providerQuery || selectedProvider) && (
                <button
                  onClick={clearProvider}
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

          {selectedProvider && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">Mostrando estado de cuenta de:</span>
              <Badge variant="primary">{selectedProvider.business_name}</Badge>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'credit_note_requests' && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva solicitud
          </Button>
        )}
      </div>

      {/* Banner de "mostrando solo un registro" */}
      {focusFilter?.tab === activeTab && (
        <div className="flex items-center justify-between px-4 py-3 border border-primary-200 bg-primary-50 rounded-xl">
          <p className="text-sm font-medium text-primary-700">
            Mostrando solo: <span className="font-semibold">{focusedFolio || '—'}</span>
          </p>
          <button
            onClick={clearFocusFilter}
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Filtros de folio/fecha/monto/estatus — solo para las primeras 3 pestañas */}
      {activeTab !== 'credit_note_requests' && !(focusFilter?.tab === activeTab) && (
        <>
          <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-gray-200 rounded-2xl">
            <div className="flex-1 min-w-[180px]">
              <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Buscar folio</label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ej. A 26"
                  className="w-full py-2.5 pl-9 pr-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Monto mín.</label>
              <input
                type="number" step="0.01"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                className="w-28 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Monto máx.</label>
              <input
                type="number" step="0.01"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="Sin límite"
                className="w-28 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {activeTab === 'invoices' && (
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-500 uppercase">Estatus</label>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {INVOICE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>

          {hasActiveFilters && !selectedProvider && (
            <p className="text-xs text-amber-600">
              Nota: los filtros de folio/fecha/monto aplican solo sobre los resultados ya cargados en pantalla (página actual). Si buscas algo que no aparece, prueba filtrar primero por proveedor.
            </p>
          )}
        </>
      )}

      {activeTab === 'invoices' && !(focusFilter?.tab === 'invoices') && (
        <p className="text-xs text-gray-400">💡 Haz clic en una factura para ver sus pagos y notas de crédito aplicados</p>
      )}

      {/* Sub-filtro de estatus — solo para la pestaña de Solicitudes */}
      {activeTab === 'credit_note_requests' && (
        <div className="flex gap-1 p-1 overflow-x-auto bg-gray-100 rounded-xl w-fit">
          {REQUEST_STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRequestStatusFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                requestStatusFilter === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
        {activeTab === 'invoices' && (
          isLoading ? <LoadingSpinner /> : (
            <Table
              columns={invoiceColumns}
              rows={filteredInvoices}
              empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin facturas'}
              expandable
              expandedKey={expandedInvoiceId}
              onRowClick={(row) => setExpandedInvoiceId((prev) => (prev === row.id ? null : row.id))}
              renderExpanded={(row) => (
                <InvoiceTimelineContent
                  invoiceId={row.id}
                  fetchTimeline={accountStatementService.getInvoiceTimelineFinance}
                  onNavigate={navigateToRecord}
                />
              )}
            />
          )
        )}

        {activeTab === 'payments' && (
          isLoading ? <LoadingSpinner /> : (
            <Table
              columns={paymentColumns}
              rows={filteredPayments}
              empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin pagos'}
            />
          )
        )}

        {activeTab === 'credit_memos' && (
          isLoading ? <LoadingSpinner /> : (
            <Table
              columns={creditMemoColumns}
              rows={filteredCreditMemos}
              empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin notas de crédito'}
            />
          )
        )}

        {activeTab === 'credit_note_requests' && (
          requestsLoading ? <LoadingSpinner /> : (
            <Table columns={requestColumns} rows={creditNoteRequests} empty="No hay solicitudes en este estatus" />
          )
        )}
      </div>

      {selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmit={(payload) => reviewMutation.mutate({ id: selectedRequest.id, payload })}
          loading={reviewMutation.isPending}
        />
      )}

      {showCreateModal && (
        <CreateCreditNoteModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

const InvoiceTimelineContent = ({ invoiceId, fetchTimeline, onNavigate }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-timeline-finance', invoiceId],
    queryFn: () => fetchTimeline(invoiceId),
  });

  if (isLoading) {
    return <div className="py-6 text-sm text-center text-gray-400">Cargando historial...</div>;
  }

  const events = [
    ...(data?.applied_payments || []).map((p) => ({
      type: 'payment', date: p.tran_date, label: `Pago ${p.tran_id}`, amount: p.amount, id: p.id,
    })),
    ...(data?.applied_credit_memos || []).map((c) => ({
      type: 'credit_memo', date: c.tran_date, label: `Nota de crédito ${c.tran_id}`, amount: c.amount, id: c.id,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (events.length === 0) {
    return <div className="py-6 text-sm text-center text-gray-400">Sin pagos ni notas de crédito aplicados a esta factura todavía</div>;
  }

  return (
    <div className="py-3">
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
    </div>
  );
};

const DashboardKpisSection = ({ kpis, onSelectProvider }) => {
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin" />
  </div>
);

const DownloadButton = ({ onClick, loading }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={loading}
    className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Descargar archivo"
  >
    {loading ? (
      <div className="w-4 h-4 border-2 rounded-full border-primary-300 border-t-primary-600 animate-spin" />
    ) : (
      <Download className="w-4 h-4" />
    )}
  </button>
);

const Table = ({
  columns, rows, empty, rowKey = (row) => row.id,
  expandable = false, expandedKey = null, onRowClick = null, renderExpanded = null,
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return rows;
    const sorted = [...rows].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb);
      return va - vb;
    });
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir, columns]);

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  if (!rows || rows.length === 0) {
    return <div className="py-16 text-center text-gray-400">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={`px-4 py-3 text-xs font-semibold tracking-wide text-left text-gray-500 uppercase ${
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                }`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {col.sortable && sortKey !== col.key && (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedRows.map((row) => {
            const key = rowKey(row);
            const isExpanded = expandable && expandedKey === key;
            return (
              <React.Fragment key={key}>
                <tr
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-gray-50 ${expandable ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">{col.render(row)}</td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-2 border-t border-gray-100 bg-gray-50">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
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

const CreateCreditNoteModal = ({ onClose }) => {
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
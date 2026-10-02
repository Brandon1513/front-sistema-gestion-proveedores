import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountStatementService } from '../../api/accountStatementService';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/shared/Table';
import { DownloadButton } from '../../components/shared/DownloadButton';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { formatMoney, formatDate, daysUntil, matchesTokens } from '../../utils/formatters';
import {
  TYPE_LABELS, requestStatusInfo, REQUEST_STATUS_TABS,
  SUBMISSION_STATUS_TABS, SUBMISSION_STATUS_INFO,
  COMPLEMENT_STATUS_TABS, COMPLEMENT_STATUS_INFO,
  INVOICE_STATUS_OPTIONS, invoiceStatusVariant,
} from '../../utils/statusMaps';
import { DashboardKpisSection } from './components/DashboardKpisSection';
import { InvoiceTimelineContent } from './components/InvoiceTimelineContent';
import { ReviewModal } from './components/ReviewModal';
import { ReviewSubmissionModal } from './components/ReviewSubmissionModal';
import { ReviewComplementModal } from './components/ReviewComplementModal';
import { CancelSubmissionModal } from './components/CancelSubmissionModal';
import { CreateCreditNoteModal } from './components/CreateCreditNoteModal';
import {
  FileText, Receipt, CreditCard, Search, Download, X, AlertTriangle,
  Clock, CheckCircle, XCircle, AlertCircle, Send, Plus,
  ChevronDown, ChevronRight,
  FileSpreadsheet, RefreshCw, FileUp, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'invoices', label: 'Facturas', icon: FileText },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'credit_memos', label: 'Notas de Crédito (NetSuite)', icon: Receipt },
  { id: 'credit_note_requests', label: 'Solicitudes de Nota de Crédito', icon: Send },
  { id: 'invoice_submissions', label: 'Facturas Recibidas', icon: FileUp },
  { id: 'payment_complements', label: 'Complementos de Pago', icon: Upload },
];

export const FinanceAccountStatementPage = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [downloadingId, setDownloadingId] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  const [focusFilter, setFocusFilter] = useState(null); // { tab, id }

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

  const [requestStatusFilter, setRequestStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const handleSyncNow = async () => {
    if (!selectedProvider) return;
    setSyncing(true);
    setLastSyncMessage(null);
    try {
      await accountStatementService.syncProviderNow(selectedProvider.id);
      setLastSyncMessage('Sincronizado ✓');
      queryClient.invalidateQueries({ queryKey: ['finance-account-statement'] });
    } catch (err) {
      setLastSyncMessage(err.response?.data?.message || 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('submitted');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [cancelSubmission, setCancelSubmission] = useState(null);
  const [complementStatusFilter, setComplementStatusFilter] = useState('submitted');
  const [selectedComplement, setSelectedComplement] = useState(null);

  const { data: complementsData, isLoading: complementsLoading } = useQuery({
    queryKey: ['finance-payment-complements'],
    queryFn: () => accountStatementService.getPaymentComplements({}),
    enabled: activeTab === 'payment_complements',
  });

  const allComplements = complementsData?.data || [];

  const filteredComplements = useMemo(() => {
    if (search.trim()) {
      return allComplements.filter((r) =>
        matchesTokens([r.payment?.tran_id, r.provider?.business_name].filter(Boolean).join(' '), search)
      );
    }
    return allComplements.filter((r) => r.status === complementStatusFilter);
  }, [allComplements, search, complementStatusFilter]);

  const reviewComplementMutation = useMutation({
    mutationFn: ({ id, payload }) => accountStatementService.reviewPaymentComplement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payment-complements'] });
      toast.success('Complemento actualizado');
      setSelectedComplement(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el complemento');
    },
  });

  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['finance-invoice-submissions'],
    queryFn: () => accountStatementService.getInvoiceSubmissions({}),
    enabled: activeTab === 'invoice_submissions',
  });

  const allSubmissions = submissionsData?.data || [];

  const filteredSubmissions = useMemo(() => {
    if (search.trim()) {
      return allSubmissions.filter((r) =>
        matchesTokens([r.serie, r.folio, r.provider?.business_name].filter(Boolean).join(' '), search)
      );
    }
    return allSubmissions.filter((r) => r.status === submissionStatusFilter);
  }, [allSubmissions, search, submissionStatusFilter]);

  const reviewSubmissionMutation = useMutation({
    mutationFn: ({ id, payload }) => accountStatementService.reviewInvoiceSubmission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoice-submissions'] });
      toast.success('Factura actualizada');
      setSelectedSubmission(null);
      setCancelSubmission(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'No se pudo actualizar la factura');
    },
  });

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

  const submissionColumns = [
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'folio', label: 'Folio', sortable: false,
      render: (r) => <span className="text-sm font-medium text-gray-900">{[r.serie, r.folio].filter(Boolean).join(' ') || '—'}</span> },
    { key: 'issued_at', label: 'Fecha', sortable: false,
      render: (r) => <span className="text-sm text-gray-600">{formatDate(r.issued_at)}</span> },
    { key: 'total', label: 'Monto', sortable: false,
      render: (r) => <span className="text-sm font-semibold text-gray-900">{formatMoney(r.total)}</span> },
    { key: 'payment_method', label: 'Método de pago', sortable: false,
      render: (r) => <span className="text-sm text-gray-600">{r.payment_method || '—'}</span> },
    { key: 'status', label: 'Status', sortable: false,
      render: (r) => {
        const info = SUBMISSION_STATUS_INFO[r.status] || SUBMISSION_STATUS_INFO.submitted;
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
          <button
            onClick={(e) => { e.stopPropagation(); accountStatementService.downloadSubmissionFile(r.id, 'pdf', `factura-${r.folio || r.id}`); }}
            className="text-gray-500 hover:text-primary-600"
            title="Descargar PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); accountStatementService.downloadSubmissionFile(r.id, 'xml', `factura-${r.folio || r.id}`); }}
            className="text-xs font-semibold text-primary-600 hover:underline"
          >
            XML
          </button>
          {r.status === 'submitted' && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedSubmission(r); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
            >
              Revisar
            </button>
          )}
          {(r.status === 'submitted' || r.status === 'captured') && (
            <button
              onClick={(e) => { e.stopPropagation(); setCancelSubmission(r); }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 rounded-lg bg-red-50 hover:bg-red-100"
              title="CFDI cancelado/re-timbrado ante el SAT"
            >
              Cancelar
            </button>
          )}
        </div>
      ) },
  ];

  const complementColumns = [
    { key: 'provider', label: 'Proveedor', sortable: true, accessor: (r) => r.provider?.business_name || '',
      render: (r) => <span className="text-sm text-gray-900">{r.provider?.business_name}</span> },
    { key: 'payment', label: 'Pago', sortable: false,
      render: (r) => <span className="text-sm font-medium text-gray-900">{r.payment?.tran_id || '—'}</span> },
    { key: 'issued_at', label: 'Fecha', sortable: false,
      render: (r) => <span className="text-sm text-gray-600">{formatDate(r.issued_at)}</span> },
    { key: 'total', label: 'Monto', sortable: false,
      render: (r) => <span className="text-sm font-semibold text-gray-900">{r.total ? formatMoney(r.total) : '—'}</span> },
    { key: 'status', label: 'Status', sortable: false,
      render: (r) => {
        const info = COMPLEMENT_STATUS_INFO[r.status] || COMPLEMENT_STATUS_INFO.submitted;
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
          <button
            onClick={(e) => { e.stopPropagation(); accountStatementService.downloadComplementFile(r.id, 'pdf', `complemento-${r.id}`); }}
            className="text-gray-500 hover:text-primary-600"
            title="Descargar PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); accountStatementService.downloadComplementFile(r.id, 'xml', `complemento-${r.id}`); }}
            className="text-xs font-semibold text-primary-600 hover:underline"
          >
            XML
          </button>
          {r.status === 'submitted' && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedComplement(r); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
            >
              Revisar
            </button>
          )}
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
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <div className="w-3 h-3 border-2 rounded-full border-primary-300 border-t-primary-600 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Sincronizar ahora
                  </>
                )}
              </button>
              {lastSyncMessage && <span className="text-xs text-green-600">{lastSyncMessage}</span>}
            </div>
          )}
        </div>
      )}

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

      {!['credit_note_requests', 'invoice_submissions', 'payment_complements'].includes(activeTab) && !(focusFilter?.tab === activeTab) && (
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

      {activeTab === 'invoice_submissions' && (
        <div className="p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="relative max-w-xs">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio o proveedor..."
              className="w-full py-2.5 pl-9 pr-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {search.trim() && (
            <p className="mt-2 text-xs text-gray-400">🔍 Buscando en todos los estatus — limpia el campo para volver a filtrar por pestaña</p>
          )}
        </div>
      )}

      {activeTab === 'invoice_submissions' && (
        <div className="flex gap-1 p-1 overflow-x-auto bg-gray-100 rounded-xl w-fit">
          {SUBMISSION_STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubmissionStatusFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                submissionStatusFilter === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'payment_complements' && (
        <div className="p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="relative max-w-xs">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pago o proveedor..."
              className="w-full py-2.5 pl-9 pr-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {search.trim() && (
            <p className="mt-2 text-xs text-gray-400">🔍 Buscando en todos los estatus — limpia el campo para volver a filtrar por pestaña</p>
          )}
        </div>
      )}

      {activeTab === 'payment_complements' && (
        <div className="flex gap-1 p-1 overflow-x-auto bg-gray-100 rounded-xl w-fit">
          {COMPLEMENT_STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setComplementStatusFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                complementStatusFilter === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
        {activeTab === 'payment_complements' && (
          complementsLoading ? <LoadingSpinner /> : (
            <Table columns={complementColumns} rows={filteredComplements} empty="No hay complementos en este estatus" />
          )
        )}
        {activeTab === 'invoice_submissions' && (
          submissionsLoading ? <LoadingSpinner /> : (
            <Table columns={submissionColumns} rows={filteredSubmissions} empty="No hay facturas en este estatus" />
          )
        )}
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
      {selectedSubmission && (
        <ReviewSubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSubmit={(payload) => reviewSubmissionMutation.mutate({ id: selectedSubmission.id, payload })}
          loading={reviewSubmissionMutation.isPending}
        />
      )}
      {cancelSubmission && (
        <CancelSubmissionModal
          submission={cancelSubmission}
          onClose={() => setCancelSubmission(null)}
          onSubmit={(payload) => reviewSubmissionMutation.mutate({ id: cancelSubmission.id, payload })}
          loading={reviewSubmissionMutation.isPending}
        />
      )}
      {selectedComplement && (
        <ReviewComplementModal
          complement={selectedComplement}
          onClose={() => setSelectedComplement(null)}
          onSubmit={(payload) => reviewComplementMutation.mutate({ id: selectedComplement.id, payload })}
          loading={reviewComplementMutation.isPending}
        />
      )}
    </div>
  );
};
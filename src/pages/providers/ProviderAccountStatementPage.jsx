import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountStatementService } from '../../api/accountStatementService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  FileText, Receipt, CreditCard, Download,
  Clock, CheckCircle, XCircle, AlertCircle, Send, Search, X, AlertTriangle,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, FileSpreadsheet,
} from 'lucide-react';

const TABS = [
  { id: 'invoices', label: 'Facturas', icon: FileText },
  { id: 'payments', label: 'Comprobantes de Pago', icon: CreditCard },
  { id: 'credit_memos', label: 'Notas de Crédito', icon: Receipt },
  { id: 'credit_note_requests', label: 'Notas de Crédito Recibidas', icon: Send },
];

const TYPE_LABELS = {
  faltante: 'Faltante',
  devolucion: 'Devolución',
  rechazo: 'Rechazo',
};

const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estatus' },
  { value: 'pending', label: 'Solo pendientes de pago' },
  { value: 'paid', label: 'Solo pagadas' },
];

const invoiceStatusVariant = (status) => {
  if (!status) return 'inactive';
  const s = status.toLowerCase();
  if (s.includes('pagado')) return 'success';
  if (s.includes('parcial')) return 'warning';
  if (s.includes('abierto') || s.includes('open')) return 'info';
  return 'inactive';
};

const requestStatusInfo = {
  pending: { label: 'Pendiente', variant: 'pending', icon: Clock },
  in_review: { label: 'En revisión', variant: 'info', icon: AlertCircle },
  approved: { label: 'Aprobada', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazada', variant: 'rejected', icon: XCircle },
  sent_to_netsuite: { label: 'Enviada a NetSuite', variant: 'success', icon: CheckCircle },
};

const formatMoney = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : '—');

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const ProviderAccountStatementPage = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [downloadingId, setDownloadingId] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Cuando navegas desde el timeline de una factura hacia un pago/nota,
  // o desde un pago/nota hacia su factura, esa pestaña se filtra a solo
  // ese registro (en vez de resaltarlo entre muchas filas).
  const [focusFilter, setFocusFilter] = useState(null); // { tab, id }

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');


  const handleExportExcel = async () => {
  setExportingExcel(true);
  try {
    await accountStatementService.exportMyAccountStatement();
  } catch (err) {
    alert('No se pudo generar el archivo. Intenta de nuevo.');
  } finally {
    setExportingExcel(false);
  }
};

  const { data, isLoading } = useQuery({
    queryKey: ['provider-account-statement'],
    queryFn: accountStatementService.getMyAccountStatement,
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
      return (data?.invoices || []).filter((inv) => inv.id === focusFilter.id);
    }
    let rows = applyCommonFilters(data?.invoices, 'tran_date');
    if (invoiceStatusFilter === 'paid') {
      rows = rows.filter((inv) => (inv.status || '').toLowerCase().includes('pagado'));
    } else if (invoiceStatusFilter === 'pending') {
      rows = rows.filter((inv) => !(inv.status || '').toLowerCase().includes('pagado'));
    }
    return rows;
  }, [data?.invoices, search, dateFrom, dateTo, amountMin, amountMax, invoiceStatusFilter, focusFilter]);

  const filteredPayments = useMemo(() => {
    if (focusFilter?.tab === 'payments') {
      return (data?.payments || []).filter((p) => p.id === focusFilter.id);
    }
    return applyCommonFilters(data?.payments, 'tran_date');
  }, [data?.payments, search, dateFrom, dateTo, amountMin, amountMax, focusFilter]);

  const filteredCreditMemos = useMemo(() => {
    if (focusFilter?.tab === 'credit_memos') {
      return (data?.credit_memos || []).filter((c) => c.id === focusFilter.id);
    }
    return applyCommonFilters(data?.credit_memos, 'tran_date');
  }, [data?.credit_memos, search, dateFrom, dateTo, amountMin, amountMax, focusFilter]);

  const handleDownloadCreditNoteFile = async (id, tranId) => {
    await accountStatementService.downloadMyCreditNoteFile(id, tranId || 'nota-credito');
  };

  const handleDownloadResponseFile = async (id) => {
    await accountStatementService.downloadMyResponseFile(id, 'mi-cfdi');
  };

  const handleDownloadNetSuiteFile = async (type, id, tranId) => {
    const key = `${type}-${id}`;
    setDownloadingId(key);
    try {
      await accountStatementService.downloadProviderNetSuiteFile(type, id, tranId || 'documento');
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
    const { invoices } = await accountStatementService.getPaymentRelatedInvoices(paymentId);
    if (invoices?.[0]) goToInvoice(invoices[0]);
    else alert('No se encontró una factura relacionada.');
  };

  const handleViewInvoiceFromCreditMemo = async (creditMemoId, e) => {
    e.stopPropagation();
    const { invoices } = await accountStatementService.getCreditMemoRelatedInvoices(creditMemoId);
    if (invoices?.[0]) goToInvoice(invoices[0]);
    else alert('No se encontró una factura relacionada.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  // ── Columnas ──
  const invoiceColumns = [
    { key: 'expand', label: '', sortable: false,
      render: (r) => (
        expandedInvoiceId === r.id
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
      ) },
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
    { key: 'invoice', label: 'Factura', sortable: false,
      render: (r) => <span className="text-sm font-medium text-gray-900">{r.related_invoice?.tran_id || '—'}</span> },
    { key: 'type', label: 'Tipo', sortable: false,
      render: (r) => <span className="text-sm text-gray-900">{TYPE_LABELS[r.type] || r.type}</span> },
    { key: 'description', label: 'Descripción', sortable: false,
      render: (r) => <span className="block max-w-xs text-sm text-gray-600 truncate">{r.description}</span> },
    { key: 'amount_requested', label: 'Monto', sortable: false,
      render: (r) => <span className="text-sm text-gray-900">{r.amount_requested ? formatMoney(r.amount_requested) : '—'}</span> },
    { key: 'evidence', label: 'Evidencia', sortable: false,
      render: (r) => r.file_path ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleDownloadCreditNoteFile(r.id, r.related_invoice?.tran_id); }}
          className="text-primary-600 hover:text-primary-800"
          title="Ver evidencia adjunta por Finanzas"
        >
          <Download className="w-4 h-4" />
        </button>
      ) : '—' },
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
    { key: 'cfdi', label: 'Mi CFDI', sortable: false,
      render: (r) => r.provider_response_file_path ? (
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <button
            onClick={(e) => { e.stopPropagation(); handleDownloadResponseFile(r.id); }}
            className="text-xs font-semibold underline hover:text-green-800"
          >
            Ver
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setRespondingTo(r); }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
        >
          Subir CFDI
        </button>
      ) },
  ];

  const focusedFolio = useMemo(() => {
    if (!focusFilter) return null;
    if (focusFilter.tab === 'invoices') return data?.invoices?.find((i) => i.id === focusFilter.id)?.tran_id;
    if (focusFilter.tab === 'payments') return data?.payments?.find((p) => p.id === focusFilter.id)?.tran_id;
    if (focusFilter.tab === 'credit_memos') return data?.credit_memos?.find((c) => c.id === focusFilter.id)?.tran_id;
    return null;
  }, [focusFilter, data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h1>
        <p className="text-sm text-gray-600">Consulta tus facturas, pagos y notas de crédito</p>
      </div>
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

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Saldo pendiente</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(data?.summary?.total_pending)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Facturas totales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{data?.summary?.invoices_count || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Última actualización</p>
          <p className="mt-1 text-sm font-semibold text-gray-700">
            {data?.summary?.last_synced_at ? new Date(data.summary.last_synced_at).toLocaleString('es-MX') : '—'}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 overflow-x-auto bg-gray-100 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = data?.[tab.id]?.length || 0;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">{count}</span>
              )}
            </button>
          );
        })}
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

      {/* Barra de filtros */}
      {activeTab !== 'credit_note_requests' && !(focusFilter?.tab === activeTab) && (
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
      )}

      {activeTab === 'invoices' && !(focusFilter?.tab === 'invoices') && (
        <p className="text-xs text-gray-400">💡 Haz clic en una factura para ver sus pagos y notas de crédito aplicados</p>
      )}

      {/* Contenido */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
        {activeTab === 'invoices' && (
          <Table
            columns={invoiceColumns}
            rows={filteredInvoices}
            empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin facturas registradas'}
            expandable
            expandedKey={expandedInvoiceId}
            onRowClick={(row) => setExpandedInvoiceId((prev) => (prev === row.id ? null : row.id))}
            renderExpanded={(row) => (
              <InvoiceTimelineContent
                invoiceId={row.id}
                fetchTimeline={accountStatementService.getMyInvoiceTimeline}
                onNavigate={navigateToRecord}
              />
            )}
          />
        )}

        {activeTab === 'payments' && (
          <Table
            columns={paymentColumns}
            rows={filteredPayments}
            empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin comprobantes de pago'}
          />
        )}

        {activeTab === 'credit_memos' && (
          <Table
            columns={creditMemoColumns}
            rows={filteredCreditMemos}
            empty={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin notas de crédito en NetSuite'}
          />
        )}

        {activeTab === 'credit_note_requests' && (
          <Table
            columns={requestColumns}
            rows={data?.credit_note_requests}
            empty="No tienes notas de crédito registradas"
          />
        )}
      </div>

      {respondingTo && (
        <RespondModal request={respondingTo} onClose={() => setRespondingTo(null)} />
      )}
    </div>
  );
};

const InvoiceTimelineContent = ({ invoiceId, fetchTimeline, onNavigate }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-timeline', invoiceId],
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

const RespondModal = ({ request, onClose }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => accountStatementService.respondToCreditNoteRequest(request.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-account-statement'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al subir el archivo'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Selecciona un archivo');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md p-6 bg-white shadow-elevated rounded-2xl">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Subir CFDI de nota de crédito</h2>
        <p className="mb-4 text-sm text-gray-500">
          {TYPE_LABELS[request.type] || request.type}
          {request.related_invoice?.tran_id ? ` — Factura ${request.related_invoice.tran_id}` : ''}
        </p>

        <p className="p-3 mb-4 text-sm text-gray-700 bg-gray-50 rounded-xl">{request.description}</p>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Archivo del CFDI (PDF o XML, máx. 10MB)
            </label>
            <input
              type="file" accept=".pdf,.xml"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm file:font-semibold"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} className="flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200">
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              Subir
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
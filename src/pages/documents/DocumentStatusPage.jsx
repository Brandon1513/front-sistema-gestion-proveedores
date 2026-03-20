import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentStatusService } from '../../api/documentStatusService';
import { documentService } from '../../api/documentService';
import { Badge } from '../../components/common/Badge';
import { showToast } from '../../utils/toast';
import {
  FileText, AlertTriangle, Clock, XCircle, CheckCircle,
  Search, Building2, ChevronRight, ChevronDown, Eye,
  Download, Calendar, Loader2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROVIDER_TYPES = [
  { value: '1', label: 'MP y ME' },
  { value: '2', label: 'Residuos' },
  { value: '3', label: 'Laboratorios' },
  { value: '4', label: 'Sustancias Químicas' },
  { value: '5', label: 'Insumos Generales' },
];

const STATUS_CONFIG = {
  approved: { label: 'Aprobado',  bg: 'bg-green-100 text-green-800',  Icon: CheckCircle  },
  pending:  { label: 'Revisión',  bg: 'bg-yellow-100 text-yellow-800', Icon: Clock        },
  rejected: { label: 'Rechazado', bg: 'bg-red-100 text-red-800',       Icon: XCircle      },
  expired:  { label: 'Vencido',   bg: 'bg-red-100 text-red-800',       Icon: AlertTriangle },
};

const getDaysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

const formatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return new Date(y, m-1, day).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
};

// ─── Mini barra de progreso ───────────────────────────────────────────────────
const DocBar = ({ summary }) => {
  const total = summary.total || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px w-full bg-gray-100">
      {summary.approved > 0 && <div title={`Aprobados: ${summary.approved}`} className="bg-green-500" style={{ width:`${(summary.approved/total)*100}%` }} />}
      {summary.pending  > 0 && <div title={`Pendientes: ${summary.pending}`} className="bg-yellow-400" style={{ width:`${(summary.pending/total)*100}%`  }} />}
      {summary.rejected > 0 && <div title={`Rechazados: ${summary.rejected}`} className="bg-red-500" style={{ width:`${(summary.rejected/total)*100}%`  }} />}
      {summary.expiring > 0 && <div title={`Por vencer: ${summary.expiring}`} className="bg-orange-400" style={{ width:`${(summary.expiring/total)*100}%` }} />}
    </div>
  );
};

// ─── Pill de alerta ───────────────────────────────────────────────────────────
const AlertPill = ({ count, color, icon: Icon, label }) => {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{count} {label}
    </span>
  );
};

// ─── Tabla de documentos de solo lectura ─────────────────────────────────────
const DocumentsReadOnly = ({ providerId }) => {
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-documents-readonly', providerId],
    queryFn: () => documentService.getByProvider(providerId),
  });

  const docs = data?.documents || [];

  const handleDownload = async (docId) => {
    setDownloadingId(docId);
    try {
      await documentService.download(providerId, docId);
      showToast.success('Documento descargado');
    } catch {
      showToast.error('Error al descargar');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = (docId) => {
    const url = documentService.getViewUrl(providerId, docId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-7 h-7 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
    </div>
  );

  if (docs.length === 0) return (
    <div className="py-8 text-center text-sm text-gray-400">
      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
      Sin documentos cargados
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {['Documento', 'Estado', 'Cargado', 'Vencimiento', 'Acciones'].map(h => (
              <th key={h} className="px-4 py-2 text-xs font-semibold text-left text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {docs.map(doc => {
            const cfg        = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const daysLeft   = getDaysLeft(doc.expiry_date);
            const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
            const isExpired  = daysLeft !== null && daysLeft < 0;
            const ext        = (doc.file_extension || '').toLowerCase();
            const canPreview = ['pdf','jpg','jpeg','png'].includes(ext);

            // Resaltar filas con problemas
            const rowBg = isExpired ? 'bg-red-50' : isExpiring ? 'bg-amber-50' : doc.status === 'rejected' ? 'bg-red-50' : doc.status === 'pending' ? 'bg-yellow-50' : '';

            return (
              <tr key={doc.id} className={`${rowBg} hover:bg-opacity-80 transition-colors`}>
                {/* Documento */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0
                      ${isExpired || doc.status==='rejected' ? 'bg-red-100' : isExpiring || doc.status==='pending' ? 'bg-amber-100' : 'bg-gradient-primary'}`}>
                      <FileText className={`w-3.5 h-3.5 ${isExpired || doc.status==='rejected' ? 'text-red-500' : isExpiring || doc.status==='pending' ? 'text-amber-500' : 'text-white'}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                      {doc.document_type?.name || doc.file_name || '—'}
                    </p>
                  </div>
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
                    <cfg.Icon className="w-3 h-3" />{cfg.label}
                  </span>
                </td>

                {/* Fecha carga */}
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>

                {/* Vencimiento */}
                <td className="px-4 py-3">
                  {doc.expiry_date ? (
                    <div>
                      <p className={`text-sm font-medium flex items-center gap-1
                        ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-700'}`}>
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {formatDate(doc.expiry_date)}
                      </p>
                      {daysLeft !== null && (
                        <p className={`text-xs ml-4 ${isExpired ? 'text-red-500 font-semibold' : isExpiring ? 'text-amber-500 font-semibold' : 'text-gray-400'}`}>
                          {isExpired ? `⚠ Vencido hace ${Math.abs(daysLeft)} días` : `${daysLeft} días restantes`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin vencimiento</span>
                  )}
                </td>

                {/* ✅ Acciones — solo ver y descargar, SIN validar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {canPreview && (
                      <button onClick={() => handlePreview(doc.id)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver documento">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDownload(doc.id)} disabled={downloadingId === doc.id}
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50" title="Descargar">
                      {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Bloque de proveedor expandible ──────────────────────────────────────────
const ProviderBlock = ({ provider, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const s = provider.docs_summary;
  const urgent = provider.most_urgent_days !== null && provider.most_urgent_days !== undefined && provider.most_urgent_days <= 7;

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all duration-200
      ${open ? 'border-primary-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'}
      ${urgent && !open ? 'border-l-4 border-l-orange-400' : ''}`}>

      {/* Header */}
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 shadow-sm
            ${urgent ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-gradient-primary'}`}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-gray-900">{provider.business_name}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                ${provider.status==='active'  ? 'bg-green-100 text-green-700'  : ''}
                ${provider.status==='pending' ? 'bg-yellow-100 text-yellow-700': ''}
                ${provider.status==='inactive'? 'bg-gray-100 text-gray-700'    : ''}
                ${provider.status==='rejected'? 'bg-red-100 text-red-700'      : ''}
              `}>{provider.status==='active'?'Activo':provider.status==='pending'?'Pendiente':provider.status==='inactive'?'Inactivo':'Rechazado'}</span>
              {provider.provider_type && <span className="text-xs text-gray-400">{provider.provider_type.name}</span>}
            </div>
            <p className="font-mono text-xs text-gray-400 mt-0.5">{provider.rfc}</p>
            {/* Alertas */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <AlertPill count={s.expiring} color="bg-orange-100 text-orange-700" icon={AlertTriangle} label="por vencer" />
              <AlertPill count={s.expired}  color="bg-red-100 text-red-700"       icon={AlertTriangle} label="vencidos"   />
              <AlertPill count={s.pending}  color="bg-yellow-100 text-yellow-700" icon={Clock}         label="en revisión" />
              <AlertPill count={s.rejected} color="bg-red-100 text-red-700"       icon={XCircle}       label="rechazados" />
            </div>
          </div>
        </div>

        {/* Resumen numérico + barra */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="hidden sm:block text-right min-w-[120px]">
            <div className="flex justify-end gap-2 mb-1.5 text-xs">
              <span className="text-green-600 font-semibold">✓ {s.approved}</span>
              <span className="text-yellow-600 font-semibold">⏱ {s.pending}</span>
              <span className="text-red-600 font-semibold">✗ {s.rejected}</span>
            </div>
            <DocBar summary={s} />
            <p className="text-xs text-gray-400 mt-1">{s.total} documentos</p>
          </div>
          {open ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* ✅ Documentos expandidos — solo lectura */}
      {open && (
        <div className="border-t border-gray-100">
          <DocumentsReadOnly providerId={provider.id} />
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const DocumentStatusPage = () => {
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [showFilter, setShowFilter]     = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['document-status', { search, typeFilter }],
    queryFn: () => documentStatusService.getAll({
      search:           search     || undefined,
      provider_type_id: typeFilter || undefined,
    }),
    refetchInterval: 60000,
  });

  const allProviders = data?.providers || [];
  const stats        = data?.stats     || {};

  const providers = allProviders.filter(p => {
    if (showFilter === 'expiring') return p.docs_summary.expiring > 0 || p.docs_summary.expired > 0;
    if (showFilter === 'pending')  return p.docs_summary.pending  > 0;
    if (showFilter === 'rejected') return p.docs_summary.rejected > 0;
    return true;
  });

  const statCards = [
    { label: 'Total Proveedores', value: stats.total_providers||0, color: 'border-primary-200 text-primary-600', bg: 'from-primary-500 to-primary-600', Icon: Building2,    filter: 'all'      },
    { label: 'Docs por Vencer',   value: stats.with_expiring  ||0, color: 'border-orange-200 text-orange-600',  bg: 'from-orange-400 to-orange-500',   Icon: AlertTriangle, filter: 'expiring' },
    { label: 'Docs Pendientes',   value: stats.with_pending   ||0, color: 'border-accent-200 text-accent-600',  bg: 'from-accent-500 to-accent-600',   Icon: Clock,         filter: 'pending'  },
    { label: 'Docs Rechazados',   value: stats.with_rejected  ||0, color: 'border-red-200 text-red-600',        bg: 'from-red-500 to-red-600',         Icon: XCircle,       filter: 'rejected' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estado Documental</h1>
            <p className="text-sm text-gray-600">Consulta el estado de documentos de todos los proveedores</p>
          </div>
        </div>
      </div>

      {/* Stats cards — clickeables para filtrar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <button key={card.label} onClick={() => setShowFilter(showFilter === card.filter ? 'all' : card.filter)}
            className={`relative overflow-hidden p-5 rounded-xl bg-white border-2 text-left
              hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]
              ${showFilter === card.filter ? card.color + ' ring-2 ring-offset-1' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{card.label}</p>
                <p className={`mt-2 text-3xl font-bold ${showFilter===card.filter ? card.color.split(' ')[1] : 'text-gray-800'}`}>{card.value}</p>
              </div>
              <div className={`bg-gradient-to-br ${card.bg} p-2.5 rounded-lg shadow-sm`}>
                <card.Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.bg}`} />
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar proveedor por nombre o RFC..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none">
            <option value="">Todos los tipos</option>
            {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(search || typeFilter || showFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setTypeFilter(''); setShowFilter('all'); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de proveedores */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-gray-700">
            {showFilter !== 'all' ? 'No hay proveedores con este tipo de alerta' : 'No se encontraron proveedores'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(provider => (
            <ProviderBlock
              key={provider.id}
              provider={provider}
              defaultOpen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
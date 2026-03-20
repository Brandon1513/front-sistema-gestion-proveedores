import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { providerService } from '../../api/providerService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ExportButtons } from '../../components/common/ExportButtons';
import { exportProvidersExcel, exportProvidersPDF } from '../../utils/reportExportService';
import { Plus, Search, Eye, Edit, Mail, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { InviteProviderModal } from '../../components/providers/InviteProviderModal';
import { useAuthStore } from '../../stores/authStore';

const STATUS_LABELS   = { active:'Activo', pending:'Pendiente', inactive:'Inactivo', rejected:'Rechazado' };
const STATUS_VARIANTS = { active:'success', pending:'warning',  inactive:'info',     rejected:'danger'    };
const PER_PAGE = 15;

// ─── Componente de Paginación ─────────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, total, perPage, onPageChange }) => {
  if (lastPage <= 1) return null;

  const from = (currentPage - 1) * perPage + 1;
  const to   = Math.min(currentPage * perPage, total);

  const getPages = () => {
    if (lastPage <= 5) return Array.from({ length: lastPage }, (_, i) => i + 1);
    if (currentPage <= 3)            return [1, 2, 3, 4, 5];
    if (currentPage >= lastPage - 2) return [lastPage-4, lastPage-3, lastPage-2, lastPage-1, lastPage];
    return [currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-4 mt-2 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-semibold text-gray-700">{from}–{to}</span> de{' '}
        <span className="font-semibold text-gray-700">{total}</span> proveedores
      </p>

      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        {/* Primera página si estamos lejos */}
        {currentPage > 3 && lastPage > 5 && (
          <>
            <button onClick={() => onPageChange(1)} className="w-8 h-8 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">1</button>
            {currentPage > 4 && <span className="px-1 text-gray-400 text-sm">…</span>}
          </>
        )}

        {/* Páginas visibles */}
        {getPages().map(page => (
          <button key={page} onClick={() => onPageChange(page)}
            className={`w-8 h-8 text-sm font-semibold rounded-lg transition-all duration-200 ${
              page === currentPage
                ? 'bg-gradient-primary text-white shadow-md'
                : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}>
            {page}
          </button>
        ))}

        {/* Última página si estamos lejos */}
        {currentPage < lastPage - 2 && lastPage > 5 && (
          <>
            {currentPage < lastPage - 3 && <span className="px-1 text-gray-400 text-sm">…</span>}
            <button onClick={() => onPageChange(lastPage)} className="w-8 h-8 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{lastPage}</button>
          </>
        )}

        {/* Siguiente */}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProvidersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch]             = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // ✅ Página actual desde URL — persiste al recargar y al usar el botón atrás
  const currentPage  = parseInt(searchParams.get('page') || '1', 10);
  const typeFilter   = searchParams.get('type')   || '';
  const statusFilter = searchParams.get('status') || '';

  const { user } = useAuthStore();
  const userRole       = user?.roles?.[0]?.name || user?.roles?.[0] || user?.role || '';
  const isAdminOrSuper = ['super_admin', 'admin'].includes(userRole);
  const isCompras      = userRole === 'compras';
  const canManage      = isCompras || isAdminOrSuper;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['providers', { search, type: typeFilter, status: statusFilter, page: currentPage }],
    queryFn: () => providerService.getAll({
      search:           search        || undefined,
      provider_type_id: typeFilter    || undefined,
      status:           statusFilter  || undefined,
      page:             currentPage,
      per_page:         PER_PAGE,
    }),
    retry: false,
    keepPreviousData: true,
  });

  const providers  = data?.data || [];
  const pagination = {
    currentPage: data?.current_page || 1,
    lastPage:    data?.last_page    || 1,
    total:       data?.total        || 0,
    perPage:     data?.per_page     || PER_PAGE,
  };

  const handlePageChange = (page) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('page', String(page));
      return params;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Al cambiar búsqueda o filtros → volver a página 1
  const handleSearchChange = (value) => {
    setSearch(value);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.delete('page');
      return params;
    });
  };

  const clearFilters     = () => { setSearchParams({}); setSearch(''); };
  const hasActiveFilters = typeFilter || statusFilter || search;

  const getStatusBadge = (status) => (
    <Badge variant={STATUS_VARIANTS[status] || 'info'}>{STATUS_LABELS[status] || status}</Badge>
  );

  if (isLoading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-primary-600" />
    </div>
  );

  if (error) return (
    <div className="p-8">
      <Card>
        <div className="text-center text-red-600">
          <p className="font-semibold">Error al cargar proveedores</p>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/providers/new')}>
              <Plus className="w-5 h-5 mr-2" />Crear Proveedor
            </Button>
            <Button onClick={() => setShowInviteModal(true)} variant="secondary">
              <Mail className="w-5 h-5 mr-2" />Invitar Proveedor
            </Button>
          </div>
        )}
        <ExportButtons
          label="Exportar lista"
          onExcelExport={() => exportProvidersExcel(providers)}
          onPdfExport={() => exportProvidersPDF(providers)}
          disabled={providers.length === 0}
        />
      </div>

      {/* Búsqueda y filtros */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Buscar por nombre o RFC..."
              value={search} onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {statusFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-300">
                  <Filter className="w-3 h-3" />
                  Estado: {STATUS_LABELS[statusFilter] || statusFilter}
                  <button onClick={() => setSearchParams(p => { p.delete('status'); p.delete('page'); return p; })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {typeFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                  <Filter className="w-3 h-3" />
                  Tipo #{typeFilter}
                  <button onClick={() => setSearchParams(p => { p.delete('type'); p.delete('page'); return p; })}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-gray-500 underline hover:text-gray-700">Limpiar todo</button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {providers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">{hasActiveFilters ? 'No se encontraron proveedores con esos filtros' : 'No se encontraron proveedores'}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">Limpiar filtros</button>}
            {canManage && !hasActiveFilters && <p className="mt-2 text-sm text-gray-400">Haz clic en "Invitar Proveedor" para comenzar</p>}
          </div>
        ) : (
          <>
            {/* ✅ Opacidad al cambiar página — indica carga sin bloquear UI */}
            <div className={`overflow-x-auto transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Razón Social', 'RFC', 'Tipo', 'Estado', 'Ciudad', 'Acciones'].map((col) => (
                      <th key={col} className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{provider.business_name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-600 whitespace-nowrap">{provider.rfc}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{provider.provider_type?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(provider.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{provider.city || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => navigate(`/providers/${provider.id}`)} className="transition-colors text-primary-600 hover:text-primary-800" title="Ver detalles">
                            <Eye className="w-5 h-5" />
                          </button>
                          {canManage && (
                            <button onClick={() => navigate(`/providers/${provider.id}/edit`)} className="text-blue-600 transition-colors hover:text-blue-800" title="Editar">
                              <Edit className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Paginación */}
            <Pagination
              currentPage={pagination.currentPage}
              lastPage={pagination.lastPage}
              total={pagination.total}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      <InviteProviderModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => { setShowInviteModal(false); refetch(); }}
      />
    </div>
  );
};
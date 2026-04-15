import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../common/Button';
import { showToast } from '../../../utils/toast';
import api from '../../../api/axios';
import {
  Package, Wrench, Search, Save, CheckCircle,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';

// ─── Servicio ────────────────────────────────────────────────────────────────
const catalogService = {
  getProviderCatalog: async () => {
    const r = await api.get('/provider/products-services');
    return r.data;
  },
  updateSelection: async (data) => {
    const r = await api.put('/provider/products-services', data);
    return r.data;
  },
};

// ─── Categoría con checkboxes ────────────────────────────────────────────────
const CategoryGroup = ({ category, selectedIds, onToggle, search }) => {
  const [expanded, setExpanded] = useState(true);

  // Filtrar por búsqueda
  const filteredItems = useMemo(() =>
    category.items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    ),
    [category.items, search]
  );

  if (filteredItems.length === 0) return null;

  const selectedCount = filteredItems.filter(i => selectedIds.includes(i.id)).length;

  return (
    <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
      {/* Header categoría */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 transition-colors bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{category.name}</span>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
              {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {/* Items */}
      {expanded && (
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {filteredItems.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 border-gray-300 rounded text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-800' : 'text-gray-700'}`}>
                    {item.name}
                  </p>
                </div>
                {isSelected && <CheckCircle className="flex-shrink-0 w-4 h-4 text-primary-500" />}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const ProductsServicesTab = () => {
  const queryClient  = useQueryClient();
  const [tab, setTab]       = useState('products'); // 'products' | 'services'
  const [search, setSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [initialized, setInitialized]               = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-catalog'],
    queryFn: catalogService.getProviderCatalog,
    onSuccess: (data) => {
      if (!initialized) {
        // Inicializar con los IDs ya seleccionados
        const ids = data.selected_ids || [];
        const productIds = (data.products || [])
          .flatMap(cat => cat.items)
          .filter(i => ids.includes(i.id))
          .map(i => i.id);
        const serviceIds = (data.services || [])
          .flatMap(cat => cat.items)
          .filter(i => ids.includes(i.id))
          .map(i => i.id);
        setSelectedProductIds(productIds);
        setSelectedServiceIds(serviceIds);
        setInitialized(true);
      }
    },
  });

  // Inicializar si onSuccess no disparó (TanStack v5)
  React.useEffect(() => {
    if (data && !initialized) {
      const ids = data.selected_ids || [];
      const productIds = (data.products || [])
        .flatMap(cat => cat.items)
        .filter(i => ids.includes(i.id))
        .map(i => i.id);
      const serviceIds = (data.services || [])
        .flatMap(cat => cat.items)
        .filter(i => ids.includes(i.id))
        .map(i => i.id);
      setSelectedProductIds(productIds);
      setSelectedServiceIds(serviceIds);
      setInitialized(true);
    }
  }, [data, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => catalogService.updateSelection({
      product_ids: selectedProductIds,
      service_ids: selectedServiceIds,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-catalog']);
      showToast.success('✓ Selección guardada correctamente');
    },
    onError: () => showToast.error('Error al guardar la selección'),
  });

  const toggleProduct = (id) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleService = (id) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const categories = tab === 'products' ? (data?.products || []) : (data?.services || []);
  const selectedIds = tab === 'products' ? selectedProductIds : selectedServiceIds;
  const totalSelected = selectedProductIds.length + selectedServiceIds.length;

  // Categorías que tienen ítems después del filtro de búsqueda
  const hasResults = categories.some(cat =>
    cat.items.some(item => item.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 rounded-full border-t-primary-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Package className="w-6 h-6 text-primary-600" />
              Productos y Servicios
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Selecciona qué productos y servicios ofreces a DASAVENA
            </p>
          </div>
          {totalSelected > 0 && (
            <span className="px-3 py-1.5 text-sm font-bold bg-primary-100 text-primary-700 rounded-xl border border-primary-200">
              {totalSelected} seleccionado{totalSelected !== 1 ? 's' : ''} en total
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-3 border border-blue-200 rounded-xl bg-blue-50">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Marca todos los productos y servicios que puedes ofrecer a DASAVENA. Esta información ayuda al área de Compras a encontrarte más fácilmente.
        </p>
      </div>

      {/* Tabs producto/servicio */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: 'products', label: 'Productos', icon: Package, count: selectedProductIds.length },
          { id: 'services', label: 'Servicios', icon: Wrench,  count: selectedServiceIds.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                tab === t.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar ${tab === 'products' ? 'productos' : 'servicios'}...`}
          className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute text-xs text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {/* Lista de categorías */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No hay {tab === 'products' ? 'productos' : 'servicios'} disponibles en el catálogo</p>
          </div>
        ) : !hasResults ? (
          <div className="py-10 text-center text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No se encontraron resultados para "<strong>{search}</strong>"</p>
          </div>
        ) : (
          categories.map(cat => (
            <CategoryGroup
              key={cat.id}
              category={cat}
              selectedIds={selectedIds}
              onToggle={tab === 'products' ? toggleProduct : toggleService}
              search={search}
            />
          ))
        )}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end pt-4 border-t-2 border-gray-200">
        <Button
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Guardar selección
        </Button>
      </div>
    </div>
  );
};
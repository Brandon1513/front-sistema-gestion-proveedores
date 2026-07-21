import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import api from '../../api/axios';
import {
  Settings, Package, Wrench, Plus, Search, Edit2,
  EyeOff, Eye, X, Save, ChevronDown, ChevronUp,
  Tag, AlertCircle, FolderOpen, Upload, FileSpreadsheet,
  CheckCircle, AlertTriangle,
} from 'lucide-react';

// ─── Servicios ────────────────────────────────────────────────────────────────
const catalogAdminService = {
  getCategories: async () => { const r = await api.get('/catalog/categories'); return r.data; },
  storeCategory: async (data) => { const r = await api.post('/catalog/categories', data); return r.data; },
  getItems: async (params = {}) => { const r = await api.get('/catalog/items', { params }); return r.data; },
  storeItem: async (data) => { const r = await api.post('/catalog/items', data); return r.data; },
  updateItem: async ({ id, ...data }) => { const r = await api.put(`/catalog/items/${id}`, data); return r.data; },
  toggleItem: async ({ id, is_active }) => { const r = await api.put(`/catalog/items/${id}`, { is_active }); return r.data; },
  importFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await api.post('/catalog/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },
};

// ─── Modal importación masiva ─────────────────────────────────────────────────
const ImportModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const fileRef     = useRef(null);
  const [file, setFile]         = useState(null);
  const [result, setResult]     = useState(null);
  const [dragging, setDragging] = useState(false);

  const mutation = useMutation({
    mutationFn: () => catalogAdminService.importFile(file),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries(['catalog-admin-items']);
      queryClient.invalidateQueries(['catalog-admin-categories']);
    },
    onError: (err) => {
      showToast.error(err.response?.data?.message || 'Error al importar');
    },
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importación masiva</h2>
              <p className="text-xs text-gray-500">Sube tu Excel o CSV con productos/servicios</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Instrucciones */}
          <div className="p-3 space-y-1 border border-blue-200 rounded-xl bg-blue-50">
            <p className="text-xs font-semibold text-blue-700">Formato requerido:</p>
            <p className="text-xs text-blue-600">El archivo debe tener dos columnas:</p>
            <div className="mt-1.5 overflow-hidden rounded-lg border border-blue-200">
              <table className="w-full text-xs">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold text-blue-800">nombre</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-blue-800">tipo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  <tr><td className="px-3 py-1.5 text-blue-700">Harina de trigo</td><td className="px-3 py-1.5 text-blue-700">producto</td></tr>
                  <tr><td className="px-3 py-1.5 text-blue-700">Calibración de balanzas</td><td className="px-3 py-1.5 text-blue-700">servicio</td></tr>
                  <tr><td className="px-3 py-1.5 text-blue-700">Aceite vegetal</td><td className="px-3 py-1.5 text-blue-700">producto</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-blue-500">
              Los ítems importados quedarán en "Sin categorizar". Acepta CSV y Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Zona de drop / selección */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                dragging
                  ? 'border-primary-400 bg-primary-50'
                  : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30'
              }`}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileChange} className="hidden" />
              {file ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-700">{file.name}</p>
                    <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-red-500 underline hover:text-red-700">
                    Cambiar archivo
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Arrastra tu archivo aquí</p>
                    <p className="text-xs text-gray-400 mt-0.5">o haz clic para seleccionar</p>
                    <p className="mt-1 text-xs text-gray-400">CSV, Excel (.xlsx, .xls) — máx 5MB</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                result.imported > 0 ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'
              }`}>
                {result.imported > 0
                  ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`text-sm font-bold ${result.imported > 0 ? 'text-green-800' : 'text-amber-800'}`}>
                    {result.imported > 0 ? '¡Importación exitosa!' : 'Importación sin nuevos ítems'}
                  </p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs font-semibold text-green-700">✓ {result.imported} importado{result.imported !== 1 ? 's' : ''}</span>
                    {result.skipped > 0 && <span className="text-xs text-amber-700">⟳ {result.skipped} omitido{result.skipped !== 1 ? 's' : ''}</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Los ítems nuevos quedaron en la categoría "Sin categorizar"
                  </p>
                </div>
              </div>

              {/* Errores detallados */}
              {result.errors?.length > 0 && (
                <div className="p-3 border border-red-200 rounded-xl bg-red-50">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">Filas con problemas:</p>
                  <ul className="space-y-0.5">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Importar otro */}
              <button onClick={() => { setResult(null); setFile(null); }}
                className="text-xs underline text-primary-600 hover:text-primary-800">
                Importar otro archivo
              </button>
            </div>
          )}

          {/* Acciones */}
          {!result && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => mutation.mutate()}
                disabled={!file}
                loading={mutation.isPending}
                leftIcon={<Upload className="w-4 h-4" />}
                className="flex-1"
              >
                {mutation.isPending ? 'Importando...' : 'Importar'}
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            </div>
          )}
          {result && (
            <div className="flex justify-end">
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modal nuevo/editar ítem ──────────────────────────────────────────────────
const ItemModal = ({ item, type, categories, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    name:        item?.name        || '',
    type:        item?.type        || type,
    category_id: item?.category?.id || '',
    description: item?.description || '',
  });
  const [error, setError] = useState('');

  const filteredCats = categories.filter(c => c.type === form.type);

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data) => catalogAdminService.updateItem({ id: item.id, ...data })
      : catalogAdminService.storeItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['catalog-admin-items']);
      showToast.success(isEdit ? 'Ítem actualizado' : 'Ítem creado correctamente');
      onClose();
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al guardar'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())  { setError('El nombre es requerido'); return; }
    if (!form.category_id)  { setError('Selecciona una categoría'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar ítem' : `Nuevo ${form.type === 'product' ? 'producto' : 'servicio'}`}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Tipo *</label>
              <div className="grid grid-cols-2 gap-2">
                {[['product','Producto',Package],['service','Servicio',Wrench]].map(([val,label,Icon]) => (
                  <button key={val} type="button"
                    onClick={() => setForm(f => ({ ...f, type: val, category_id: '' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.type === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Categoría *</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">
              <option value="">Selecciona una categoría...</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.type === 'product' ? 'Ej. Harina de trigo' : 'Ej. Calibración de balanzas'}
              maxLength={150}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Descripción <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} maxLength={500}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none" />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} leftIcon={<Save className="w-4 h-4" />} className="flex-1">
              {isEdit ? 'Guardar cambios' : 'Crear ítem'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal nueva categoría ────────────────────────────────────────────────────
const CategoryModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'product', description: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: catalogAdminService.storeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['catalog-admin-categories']);
      showToast.success('Categoría creada correctamente');
      onClose();
    },
    onError: () => setError('Error al crear la categoría'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es requerido'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Nueva categoría</h2>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {[['product','Productos',Package],['service','Servicios',Wrench]].map(([val,label,Icon]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, type: val }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.type === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Materias Primas" maxLength={100}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Descripción <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} maxLength={500}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1">Crear categoría</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Grupo categoría con ítems ────────────────────────────────────────────────
const CategoryGroup = ({ category, items, onEditItem, onToggleItem }) => {
  const [expanded, setExpanded] = useState(true);
  const activeItems   = items.filter(i => i.is_active);
  const inactiveItems = items.filter(i => !i.is_active);

  return (
    <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
      <div onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100">
        <div className="flex items-center gap-2">
          <FolderOpen className={`w-4 h-4 ${category.name === 'Sin categorizar' ? 'text-amber-500' : 'text-gray-500'}`} />
          <span className={`text-sm font-bold ${category.name === 'Sin categorizar' ? 'text-amber-700' : 'text-gray-800'}`}>
            {category.name}
          </span>
          {category.name === 'Sin categorizar' && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">
              Asignar categoría
            </span>
          )}
          <span className="text-xs text-gray-400">
            {activeItems.length} activo{activeItems.length !== 1 ? 's' : ''}
            {inactiveItems.length > 0 && ` · ${inactiveItems.length} inactivo${inactiveItems.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm italic text-gray-400">Sin ítems en esta categoría</p>
          ) : (
            items.map(item => (
              <div key={item.id} className={`flex items-center justify-between px-4 py-3 ${!item.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {item.name}
                  </p>
                  {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                </div>
                <div className="flex items-center flex-shrink-0 gap-2 ml-4">
                  <button onClick={() => onEditItem(item)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onToggleItem(item)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.is_active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`} title={item.is_active ? 'Desactivar' : 'Activar'}>
                    {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const CatalogPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab]         = useState('products');
  const [search, setSearch]   = useState('');
  const [editingItem, setEditingItem]     = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal]   = useState(false);
  const [showImport, setShowImport]       = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['catalog-admin-categories'],
    queryFn: catalogAdminService.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['catalog-admin-items', tab, search],
    queryFn: () => catalogAdminService.getItems({
      type: tab === 'products' ? 'product' : 'service',
      search: search || undefined,
    }),
    staleTime: 30 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: catalogAdminService.toggleItem,
    onSuccess: () => { queryClient.invalidateQueries(['catalog-admin-items']); showToast.success('Estado actualizado'); },
    onError: () => showToast.error('Error al actualizar'),
  });

  const categories    = (categoriesData?.categories || []).filter(c => c.type === (tab === 'products' ? 'product' : 'service'));
  const items         = itemsData?.items || [];
  const totalActive   = items.filter(i => i.is_active).length;
  const totalInactive = items.filter(i => !i.is_active).length;
  const uncategorized = items.filter(i => i.category?.name === 'Sin categorizar').length;

  const itemsByCategory = categories.reduce((acc, cat) => {
    acc[cat.id] = items.filter(i => i.category?.id === cat.id);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-600">Catálogo de productos y servicios</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
            Importar Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCatModal(true)}
            leftIcon={<Tag className="w-4 h-4" />}>
            Nueva categoría
          </Button>
          <Button onClick={() => { setEditingItem(null); setShowItemModal(true); }}
            leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo ítem
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label:'Total',           value: items.length,  color:'blue'  },
          { label:'Activos',         value: totalActive,   color:'green' },
          { label:'Inactivos',       value: totalInactive, color:'gray'  },
          { label:'Sin categorizar', value: uncategorized, color:'amber' },
        ].map(s => (
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerta si hay sin categorizar */}
      {uncategorized > 0 && (
        <div className="flex items-start gap-3 p-4 border bg-amber-50 border-amber-300 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {uncategorized} ítem{uncategorized !== 1 ? 's' : ''} sin categorizar
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Edítalos y asígnales una categoría para que aparezcan organizados en el perfil del proveedor.
            </p>
          </div>
        </div>
      )}

      {/* Tabs + búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['products','Productos',Package],['services','Servicios',Wrench]].map(([val,label,Icon]) => (
            <button key={val} onClick={() => { setTab(val); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === val ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar ${tab === 'products' ? 'productos' : 'servicios'}...`}
            className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400" />
          {search && <button onClick={() => setSearch('')} className="absolute text-xs text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600">✕</button>}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 rounded-full border-t-primary-600 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No hay categorías creadas</p>
          <Button onClick={() => setShowCatModal(true)} leftIcon={<Plus className="w-4 h-4" />} className="mt-4">
            Crear primera categoría
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <CategoryGroup
              key={cat.id}
              category={cat}
              items={itemsByCategory[cat.id] || []}
              onEditItem={(item) => { setEditingItem(item); setShowItemModal(true); }}
              onToggleItem={(item) => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      {showImport    && <ImportModal onClose={() => setShowImport(false)} />}
      {showItemModal && <ItemModal item={editingItem} type={tab === 'products' ? 'product' : 'service'} categories={categoriesData?.categories || []} onClose={() => { setShowItemModal(false); setEditingItem(null); }} />}
      {showCatModal  && <CategoryModal onClose={() => setShowCatModal(false)} />}
    </div>
  );
};
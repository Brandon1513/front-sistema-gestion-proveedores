import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import api from '../../api/axios';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X,
  AlertCircle, ChevronDown, ChevronUp, FileText,
  Users, Shield, Search, Check, Package,
  Tag, Info, Lock, CheckCircle, XCircle, Layers,
} from 'lucide-react';

// ─── Service ──────────────────────────────────────────────────────────────────
const providerTypeService = {
  getAll:          ()         => api.get('/provider-types').then(r => r.data),
  create:          (data)     => api.post('/provider-types', data).then(r => r.data),
  update:          (id, data) => api.put(`/provider-types/${id}`, data).then(r => r.data),
  toggleActive:    (id)       => api.patch(`/provider-types/${id}/toggle-active`).then(r => r.data),
  destroy:         (id)       => api.delete(`/provider-types/${id}`).then(r => r.data),
  getDocuments:    (id)       => api.get(`/provider-types/${id}/documents`).then(r => r.data),
  assignDocument:  (id, data) => api.post(`/provider-types/${id}/documents`, data).then(r => r.data),
  toggleRequired:  (id, docId) => api.patch(`/provider-types/${id}/documents/${docId}/toggle-required`).then(r => r.data),
  removeDocument:  (id, docId) => api.delete(`/provider-types/${id}/documents/${docId}`).then(r => r.data),
};

const CATEGORY_COLORS = {
  fiscal:    'bg-blue-100 text-blue-700 border-blue-200',
  technical: 'bg-purple-100 text-purple-700 border-purple-200',
  tecnico:   'bg-purple-100 text-purple-700 border-purple-200',
  legal:     'bg-amber-100 text-amber-700 border-amber-200',
  quality:   'bg-green-100 text-green-700 border-green-200',
  otro:      'bg-gray-100 text-gray-700 border-gray-200',
};
const catColor = (c) => CATEGORY_COLORS[c] || CATEGORY_COLORS.otro;
const catLabel = (c) => ({ fiscal:'Fiscal', technical:'Técnico', tecnico:'Técnico', legal:'Legal', quality:'Calidad', otro:'Otro' }[c] || c);

// ─── Modal crear/editar tipo ──────────────────────────────────────────────────
const ProviderTypeModal = ({ type, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit = !!type;
  const [form, setForm] = useState({
    name:        type?.name        || '',
    code:        type?.code        || '',
    form_code:   type?.form_code   || '',
    description: type?.description || '',
    is_active:   type?.is_active   ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data) => providerTypeService.update(type.id, data)
      : providerTypeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-types-mgmt'], exact: false });
      showToast.success(isEdit ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente');
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al guardar'),
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
              <Tag className="w-5 h-5 text-white"/>
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Editar Tipo de Proveedor' : 'Nuevo Tipo de Proveedor'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Ej. Materias Primas y Material de Empaque"
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Código <span className="font-normal text-gray-400">(opcional)</span></label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))}
                placeholder="mp_me"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
              <p className="mt-1 text-xs text-gray-400">Se genera automáticamente si no se especifica</p>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Código de formulario</label>
              <input type="text" value={form.form_code} onChange={e => setForm(f => ({...f, form_code: e.target.value}))}
                placeholder="F-COM-02"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              rows={3} placeholder="Descripción del tipo de proveedor..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(f => ({...f, is_active: !f.is_active}))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </div>
            <span className="text-sm font-semibold text-gray-700">Activo</span>
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              {isEdit ? 'Guardar cambios' : 'Crear tipo'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Panel de documentos asignados ───────────────────────────────────────────
const DocumentsPanel = ({ providerType, onClose }) => {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [availableSearch,    setAvailableSearch]    = useState('');
  const [availableCatFilter, setAvailableCatFilter] = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [showAssign, setShowAssign] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-type-documents', providerType.id],
    queryFn:  () => providerTypeService.getDocuments(providerType.id),
  });

  const assigned  = data?.assigned  || [];
  const available = data?.available || [];

  // Agrupar asignados por categoría
  const groupedAssigned = useMemo(() => {
    const filtered = assigned.filter(d =>
      (!catFilter || d.category === catFilter) &&
      (!search    || d.name.toLowerCase().includes(search.toLowerCase()))
    );
    return filtered.reduce((acc, doc) => {
      const cat = doc.category || 'otro';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    }, {});
  }, [assigned, search, catFilter]);

  const filteredAvailable = useMemo(() => {
    return available.filter(d =>
        (!availableCatFilter || d.category === availableCatFilter) &&
        (!availableSearch    || d.name.toLowerCase().includes(availableSearch.toLowerCase()) ||
                            (d.description || '').toLowerCase().includes(availableSearch.toLowerCase()))
    );
    }, [available, availableSearch, availableCatFilter]);

  const toggleRequiredMutation = useMutation({
    mutationFn: (docId) => providerTypeService.toggleRequired(providerType.id, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-type-documents', providerType.id] }),
    onError: () => showToast.error('Error al cambiar'),
  });

  const removeMutation = useMutation({
    mutationFn: (docId) => providerTypeService.removeDocument(providerType.id, docId),
    onSuccess: (_, docId) => {
      queryClient.invalidateQueries({ queryKey: ['provider-type-documents', providerType.id] });
      showToast.success('Documento removido');
    },
    onError: () => showToast.error('Error al remover'),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => providerTypeService.assignDocument(providerType.id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['provider-type-documents', providerType.id] });
      showToast.success('Documento asignado');
    },
    onError: (err) => showToast.error(err.response?.data?.message || 'Error al asignar'),
  });

  const categories = [...new Set(assigned.map(d => d.category))].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
              <FileText className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Documentos — {providerType.name}</h2>
              <p className="text-xs text-gray-500">{assigned.length} documentos asignados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4"/>} onClick={() => setShowAssign(!showAssign)}>
              Asignar documento
            </Button>
            <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Panel de asignación */}
          {showAssign && (
            <div className="p-4 border-2 border-primary-200 rounded-xl bg-primary-50/30">
                <h3 className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-900">
                <Plus className="w-4 h-4 text-primary-600"/>
                Asignar documento disponible
                </h3>

                {/* Buscador + filtro categoría para disponibles */}
                <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                    <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
                    <input
                    type="text"
                    value={availableSearch}
                    onChange={e => setAvailableSearch(e.target.value)}
                    placeholder="Buscar documento disponible..."
                    className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                </div>
                <select
                    value={availableCatFilter}
                    onChange={e => setAvailableCatFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                    <option value="">Todas las categorías</option>
                    {[...new Set(available.map(d => d.category).filter(Boolean))].map(c => (
                    <option key={c} value={c}>{catLabel(c)}</option>
                    ))}
                </select>
                </div>

                {available.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Todos los documentos activos ya están asignados.</p>
                ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(
                    filteredAvailable.reduce((acc, doc) => {
                        const cat = doc.category || 'otro';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(doc);
                        return acc;
                    }, {})
                    ).length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No hay documentos que coincidan con la búsqueda.</p>
                    ) : (
                    Object.entries(
                        filteredAvailable.reduce((acc, doc) => {
                        const cat = doc.category || 'otro';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(doc);
                        return acc;
                        }, {})
                    ).map(([cat, docs]) => (
                        <div key={cat}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 mt-2">{catLabel(cat)}</p>
                        {docs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl mb-1.5 hover:border-primary-300 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                                {doc.description && <p className="text-xs text-gray-500 truncate">{doc.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                <button
                                onClick={() => assignMutation.mutate({ document_type_id: doc.id, is_required: true })}
                                disabled={assignMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">
                                Obligatorio
                                </button>
                                <button
                                onClick={() => assignMutation.mutate({ document_type_id: doc.id, is_required: false })}
                                disabled={assignMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 disabled:opacity-50">
                                Opcional
                                </button>
                            </div>
                            </div>
                        ))}
                        </div>
                    ))
                    )}
                </div>
                )}
            </div>
            )}

          {/* Filtros */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2"/>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar documento..."
                className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>Obligatorio</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/>Opcional</span>
            <span className="text-gray-400 italic">Haz clic en el badge para cambiar entre obligatorio/opcional</span>
          </div>

          {/* Lista agrupada */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-t-primary-500 rounded-full animate-spin"/>
            </div>
          ) : assigned.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="font-medium text-gray-500">No hay documentos asignados</p>
              <p className="text-sm text-gray-400 mt-1">Usa "Asignar documento" para agregar documentos a este tipo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAssigned).map(([cat, docs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${catColor(cat)}`}>
                      {catLabel(cat)}
                    </span>
                    <span className="text-xs text-gray-400">{docs.length} documento{docs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          doc.is_required
                            ? 'border-red-200 bg-red-50/30'
                            : 'border-blue-200 bg-blue-50/30'
                        }`}>
                        {/* Toggle obligatorio/opcional */}
                        <button
                          onClick={() => toggleRequiredMutation.mutate(doc.id)}
                          disabled={toggleRequiredMutation.isPending}
                          title={doc.is_required ? 'Cambiar a opcional' : 'Cambiar a obligatorio'}
                          className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all hover:opacity-80 ${
                            doc.is_required
                              ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                          }`}>
                          {doc.is_required
                            ? <><CheckCircle className="w-3 h-3"/>Obligatorio</>
                            : <><Info className="w-3 h-3"/>Opcional</>
                          }
                        </button>

                        {/* Info del documento */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {doc.requires_expiry && (
                              <span className="text-xs text-gray-500">
                                Vence {doc.expiry_months ? `en ${doc.expiry_months} meses` : '(manual)'}
                              </span>
                            )}
                            {doc.allows_multiple && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                                <Layers className="w-3 h-3"/>Múltiples
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quitar */}
                        <button
                          onClick={() => removeMutation.mutate(doc.id)}
                          disabled={removeMutation.isPending}
                          title="Quitar del tipo"
                          className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProviderTypeManagementPage = () => {
  const queryClient = useQueryClient();
  const [showCreateModal,   setShowCreateModal]   = useState(false);
  const [editingType,       setEditingType]       = useState(null);
  const [managingDocsFor,   setManagingDocsFor]   = useState(null);
  const [confirmDelete,     setConfirmDelete]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-types-mgmt'],
    queryFn:  providerTypeService.getAll,
  });
  const providerTypes = data?.provider_types || [];

  const toggleMutation = useMutation({
    mutationFn: (id) => providerTypeService.toggleActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-types-mgmt'] }),
    onError:   () => showToast.error('Error al cambiar estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => providerTypeService.destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-types-mgmt'] });
      showToast.success('Tipo eliminado correctamente');
      setConfirmDelete(null);
    },
    onError: (err) => {
      showToast.error(err.response?.data?.message || 'Error al eliminar');
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Tag className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Proveedor</h1>
            <p className="text-sm text-gray-600">Gestiona los tipos y sus documentos requeridos</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4"/>} onClick={() => setShowCreateModal(true)}>
          Nuevo tipo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total',    value: providerTypes.length,                                    color: 'blue'  },
          { label: 'Activos',  value: providerTypes.filter(t => t.is_active).length,           color: 'green' },
          { label: 'Inactivos',value: providerTypes.filter(t => !t.is_active).length,          color: 'gray'  },
          { label: 'Proveedores', value: providerTypes.reduce((s, t) => s + (t.providers_count || 0), 0), color: 'purple' },
        ].map(s => (
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-xl bg-blue-50">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">¿Cómo funciona?</p>
          <p className="text-xs text-blue-700">Cada tipo de proveedor tiene su propia lista de documentos. Puedes asignar documentos como <strong>Obligatorios</strong> (bloquean la activación si no están) u <strong>Opcionales</strong> (se piden pero no bloquean). Haz clic en el badge de un documento para cambiar entre ambos.</p>
        </div>
      </div>

      {/* Lista de tipos */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-t-primary-500 rounded-full animate-spin"/>
        </div>
      ) : providerTypes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-500">No hay tipos de proveedor configurados</p>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4"/>} onClick={() => setShowCreateModal(true)} className="mt-4">
            Crear primer tipo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {providerTypes.map(type => (
            <div key={type.id}
              className={`p-5 bg-white border-2 rounded-xl transition-all hover:shadow-md ${
                type.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Indicador activo */}
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full ${type.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{type.name}</h3>
                      {type.code && (
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{type.code}</span>
                      )}
                      {type.form_code && (
                        <span className="text-xs text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded">
                          {type.form_code}
                        </span>
                      )}
                      {!type.is_active && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Inactivo</span>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{type.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5"/>
                        {type.providers_count || 0} proveedor{(type.providers_count || 0) !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5"/>}
                    onClick={() => setManagingDocsFor(type)}>
                    Documentos
                  </Button>
                  <button onClick={() => setEditingType(type)}
                    className="p-2 text-blue-600 rounded-lg hover:bg-blue-50" title="Editar">
                    <Edit2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => toggleMutation.mutate(type.id)}
                    disabled={toggleMutation.isPending}
                    className={`p-2 rounded-lg transition-colors ${type.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                    title={type.is_active ? 'Desactivar' : 'Activar'}>
                    {type.is_active
                      ? <ToggleRight className="w-5 h-5"/>
                      : <ToggleLeft  className="w-5 h-5"/>
                    }
                  </button>
                  <button onClick={() => setConfirmDelete(type)}
                    disabled={(type.providers_count || 0) > 0}
                    className={`p-2 rounded-lg transition-colors ${
                      (type.providers_count || 0) > 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={(type.providers_count || 0) > 0 ? 'No se puede eliminar: tiene proveedores' : 'Eliminar'}>
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {(showCreateModal || editingType) && (
        <ProviderTypeModal
          type={editingType}
          onClose={() => { setShowCreateModal(false); setEditingType(null); }}
        />
      )}

      {/* Modal gestión de documentos */}
      {managingDocsFor && (
        <DocumentsPanel
          providerType={managingDocsFor}
          onClose={() => setManagingDocsFor(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600"/>
              </div>
              <div>
                <p className="font-bold text-gray-900">¿Eliminar tipo?</p>
                <p className="text-sm text-gray-600">"{confirmDelete.name}"</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Esta acción también eliminará la asignación de todos sus documentos. No se puede deshacer.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="danger" loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)} className="flex-1">
                Eliminar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleteMutation.isPending}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
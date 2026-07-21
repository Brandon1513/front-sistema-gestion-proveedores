import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import api from '../../api/axios';
import {
  FileText, Plus, Edit2, ToggleLeft, ToggleRight, X,
  AlertCircle, ChevronDown, ChevronUp,
  GripVertical, Search, Filter, Clock, Users,
  Shield, Info, Trash2, Eye, EyeOff, FolderOpen,
  Pencil, Check, Calendar, FileUp, Download, FileBadge,
  CheckSquare, Square,
} from 'lucide-react';

// ─── Services ─────────────────────────────────────────────────────────────────
const docTypeService = {
  getAll:           () => api.get('/document-types').then(r => r.data),
  getProviderTypes: () => api.get('/document-types/provider-types').then(r => r.data),
  getGroups:        () => api.get('/document-types/groups').then(r => r.data),
  create:           (data) => api.post('/document-types', data).then(r => r.data),
  update:           (id, data) => api.put(`/document-types/${id}`, data).then(r => r.data),
  toggleActive:     (id) => api.patch(`/document-types/${id}/toggle-active`).then(r => r.data),
  reorder:          (data) => api.post('/document-types/reorder', data).then(r => r.data),
  removeFromProviderType: (id, provider_type_id) =>
    api.delete(`/document-types/${id}/provider-type`, { data: { provider_type_id } }).then(r => r.data),
  createGroup:  (data) => api.post('/document-types/groups', data).then(r => r.data),
  updateGroup:  (id, data) => api.put(`/document-types/groups/${id}`, data).then(r => r.data),
  deleteGroup:  (id) => api.delete(`/document-types/groups/${id}`).then(r => r.data),
  reorderGroups:(data) => api.post('/document-types/groups/reorder', data).then(r => r.data),
};

const templateService = {
  getAll:             (docTypeId) => api.get('/document-templates', { params: { document_type_id: docTypeId } }).then(r => r.data),
  getCatalogProducts: ()          => api.get('/document-templates/catalog-products').then(r => r.data),
  upload:             (formData)  => api.post('/document-templates', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  delete:             (id)        => api.delete(`/document-templates/${id}`).then(r => r.data),
  download:           (id)        => api.get(`/document-templates/${id}/download`, { responseType: 'blob' }),
};

const TEMPLATE_TYPES = [
  'General',
  'Cumarina',
  'Melamina',
  'Sulfitos',
  'Carta ingredientes Finales',
];

const CATEGORY_OPTIONS = [
  { value: 'fiscal',    label: 'Fiscal',    color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { value: 'tecnico',   label: 'Técnico',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'technical', label: 'Technical', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'legal',     label: 'Legal',     color: 'bg-amber-100 text-amber-700 border-amber-200'    },
  { value: 'otro',      label: 'Otro',      color: 'bg-gray-100 text-gray-700 border-gray-200'       },
];
const getCategoryStyle = (cat) =>
  CATEGORY_OPTIONS.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700 border-gray-200';

const EXPIRY_PRESETS = [
  { months: 1, label: '1 mes' }, { months: 2, label: '2 meses' },
  { months: 3, label: '3 meses' }, { months: 6, label: '6 meses' },
  { months: 9, label: '9 meses' }, { months: 12, label: '1 año' },
];

const TEMPLATE_DOC_CODES = ['carta_garantia', 'carta_no_trabajo_infantil'];

// ─── Panel de templates ───────────────────────────────────────────────────────
const TemplatesPanel = ({ documentTypeId, documentTypeName, singleFormat = false }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [expanded, setExpanded]                 = useState(false);
  const [templateName, setTemplateName]         = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch]       = useState('');
  const [file, setFile]                         = useState(null);
  const [error, setError]                       = useState('');
  const [downloadingId, setDownloadingId]       = useState(null);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['document-templates', documentTypeId],
    queryFn: () => templateService.getAll(documentTypeId),
    enabled: expanded,
    staleTime: 60 * 1000,
  });

  const { data: catalogData } = useQuery({
    queryKey: ['catalog-products-for-templates'],
    queryFn: templateService.getCatalogProducts,
    enabled: expanded && !singleFormat,
    staleTime: 10 * 60 * 1000,
  });

  const templates       = templatesData?.templates || [];
  const catalogProducts = catalogData?.products    || [];

  const assignedProducts = useMemo(() =>
    new Set(templates.map(t => t.product_name.toLowerCase().trim())),
    [templates]
  );

  const filteredProducts = useMemo(() =>
    catalogProducts.filter(p =>
      !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    ),
    [catalogProducts, productSearch]
  );

  const toggleProduct = (name) => {
    setSelectedProducts(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleAll = () => {
    const filteredNames = filteredProducts.map(p => p.name);
    const allSelected   = filteredNames.every(n => selectedProducts.includes(n));
    if (allSelected) {
      setSelectedProducts(prev => prev.filter(n => !filteredNames.includes(n)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...filteredNames])]);
    }
  };

  const allFilteredSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selectedProducts.includes(p.name));

  const uploadMutation = useMutation({
    mutationFn: (formData) => templateService.upload(formData),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['document-templates', documentTypeId]);
      showToast.success(res.message || 'Formato subido correctamente');
      setTemplateName(''); setSelectedProducts([]); setFile(null);
      setProductSearch(''); setError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al subir el formato'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => templateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-templates', documentTypeId]);
      showToast.success('Formato eliminado');
    },
    onError: () => showToast.error('Error al eliminar'),
  });

  const handleDownload = async (template) => {
    setDownloadingId(template.id);
    try {
      const response = await templateService.download(template.id);
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', template.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast.error('Error al descargar'); }
    finally { setDownloadingId(null); }
  };

  // ✅ handleSubmit — lógica diferente según singleFormat
  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!singleFormat && !templateName)               { setError('Selecciona el tipo de carta'); return; }
    if (!singleFormat && selectedProducts.length === 0) { setError('Selecciona al menos un producto'); return; }
    if (!file)                                        { setError('Selecciona un archivo'); return; }

    const fd = new FormData();
    fd.append('document_type_id', documentTypeId);
    fd.append('template_name',    singleFormat ? 'General' : templateName);
    if (singleFormat) {
      fd.append('product_names[]', 'general');
    } else {
      selectedProducts.forEach(name => fd.append('product_names[]', name));
    }
    fd.append('file', file);
    uploadMutation.mutate(fd);
  };

  const grouped = useMemo(() => {
    const map = {};
    TEMPLATE_TYPES.forEach(t => { if (!map[t]) map[t] = []; });
    templates.forEach(t => {
      if (!map[t.template_name]) map[t.template_name] = [];
      map[t.template_name].push(t);
    });
    return map;
  }, [templates]);

  return (
    <div className="overflow-hidden bg-white border-2 border-emerald-200 rounded-xl">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 transition-colors bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600">
            <FileBadge className="w-4 h-4 text-white"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900">Formatos de {documentTypeName}</p>
            <p className="text-xs text-gray-500">
              {templates.length > 0
                ? `${templates.length} formato${templates.length !== 1 ? 's' : ''} cargado${templates.length !== 1 ? 's' : ''}`
                : 'Archivo de formato que el proveedor debe seguir'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
      </button>

      {expanded && (
        <div className="p-4 space-y-5">

          {/* ── Lista de templates ── */}
          {isLoading ? (
            <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 rounded-full border-t-emerald-500 animate-spin"/></div>
          ) : templates.length > 0 ? (
            <div className="space-y-2">
              {/* ✅ singleFormat — mostrar solo el archivo sin agrupar por tipo/producto */}
              {singleFormat ? (
                templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 border border-emerald-200 rounded-xl bg-emerald-50">
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                      <div className="flex items-center justify-center flex-shrink-0 rounded-lg w-9 h-9 bg-emerald-100">
                        <FileText className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-emerald-900">{t.original_filename}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Formato activo · disponible para descarga por proveedores</p>
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 gap-1 ml-3">
                      <button onClick={() => handleDownload(t)} disabled={downloadingId === t.id}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Descargar">
                        <Download className="w-4 h-4"/>
                      </button>
                      <button onClick={() => { if (confirm('¿Eliminar este formato?')) deleteMutation.mutate(t.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                /* Agrupado por tipo — Carta Garantía */
                TEMPLATE_TYPES.filter(t => grouped[t]?.length > 0).map(typeName => (
                  <div key={typeName}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileBadge className="w-3.5 h-3.5 text-emerald-600"/>
                      <p className="text-xs font-bold tracking-wide uppercase text-emerald-700">{typeName}</p>
                      <span className="text-xs font-normal text-gray-400 normal-case">
                        ({grouped[typeName].length} producto{grouped[typeName].length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="space-y-1.5 ml-5">
                      {grouped[typeName].map(t => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 transition-colors border border-gray-200 rounded-xl bg-gray-50 hover:bg-white">
                          <div className="flex items-center flex-1 min-w-0 gap-2">
                            <FileText className="flex-shrink-0 w-4 h-4 text-emerald-500"/>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.product_name}</p>
                              <p className="text-xs text-gray-400 truncate">{t.original_filename}</p>
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0 gap-1 ml-3">
                            <button onClick={() => handleDownload(t)} disabled={downloadingId === t.id}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Descargar">
                              <Download className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => { if (confirm(`¿Eliminar el formato de "${t.product_name}"?`)) deleteMutation.mutate(t.id); }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-gray-400">
              <FileBadge className="w-8 h-8 mx-auto mb-2 opacity-40"/>
              <p className="text-sm">No hay formatos cargados aún</p>
            </div>
          )}

          {/* ── Formulario nuevo template ── */}
          <div className="pt-4 border-t-2 border-gray-100">
            <p className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-800">
              <FileUp className="w-4 h-4 text-emerald-500"/>
              {singleFormat
                ? templates.length > 0 ? 'Reemplazar formato' : 'Subir formato'
                : 'Subir nuevo formato'
              }
            </p>

            {/* ✅ Aviso si singleFormat ya tiene formato */}
            {singleFormat && templates.length > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border border-amber-200 rounded-xl bg-amber-50">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700">
                  Al subir un nuevo archivo se <span className="font-semibold">reemplazará</span> el formato actual. Los proveedores verán el nuevo archivo al descargar.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ✅ Tipo de carta — SOLO para Carta Garantía */}
              {!singleFormat && (
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    Tipo de carta *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TEMPLATE_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setTemplateName(t)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold text-left transition-all ${
                          templateName === t
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50/40'
                        }`}>
                        {templateName === t && <Check className="inline w-3 h-3 mr-1 text-emerald-600"/>}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ Selector de productos — SOLO para Carta Garantía */}
              {!singleFormat && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Productos que aplica *
                    </label>
                    {selectedProducts.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedProducts.length} seleccionado{selectedProducts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden border-2 border-gray-200 rounded-xl focus-within:border-emerald-400">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
                      <Search className="flex-shrink-0 w-4 h-4 text-gray-400"/>
                      <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none"/>
                      {productSearch && (
                        <button type="button" onClick={() => setProductSearch('')} className="p-0.5 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
                      <button type="button" onClick={toggleAll}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-600 transition-colors hover:text-emerald-700">
                        {allFilteredSelected
                          ? <CheckSquare className="w-4 h-4 text-emerald-600"/>
                          : <Square className="w-4 h-4 text-gray-400"/>
                        }
                        {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        {productSearch && <span className="font-normal text-gray-400">(filtrados)</span>}
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {filteredProducts.length === 0 ? (
                        <p className="py-4 text-xs text-center text-gray-400">No se encontraron productos</p>
                      ) : (
                        filteredProducts.map(p => {
                          const isSelected  = selectedProducts.includes(p.name);
                          const hasTemplate = assignedProducts.has(p.name.toLowerCase().trim());
                          return (
                            <button key={p.id} type="button" onClick={() => toggleProduct(p.name)}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                              <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white"/>}
                              </div>
                              <span className={`flex-1 truncate ${isSelected ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}>{p.name}</span>
                              {hasTemplate && !isSelected && <span className="flex-shrink-0 text-xs text-amber-500">ya tiene formato</span>}
                              {hasTemplate && isSelected  && <span className="flex-shrink-0 text-xs text-emerald-500">reemplazar</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedProducts.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-lg bg-emerald-100 text-emerald-800 border-emerald-200">
                          {name}
                          <button type="button" onClick={() => toggleProduct(name)} className="text-emerald-500 hover:text-emerald-800 ml-0.5">
                            <X className="w-3 h-3"/>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Archivo */}
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Archivo (PDF o Word) *
                </label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"/>
                {file && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <Check className="w-3 h-3"/>{file.name}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 border border-red-200 rounded-xl bg-red-50">
                  <AlertCircle className="flex-shrink-0 w-4 h-4 text-red-500"/>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <Button type="submit" size="sm" loading={uploadMutation.isPending}
                leftIcon={<FileUp className="w-3.5 h-3.5"/>}
                disabled={(!singleFormat && (!templateName || selectedProducts.length === 0)) || !file}
                className="text-white bg-emerald-600 hover:bg-emerald-700">
                {uploadMutation.isPending
                  ? 'Subiendo...'
                  : singleFormat
                    ? templates.length > 0 ? 'Reemplazar formato' : 'Subir formato'
                    : `Subir formato para ${selectedProducts.length} producto${selectedProducts.length !== 1 ? 's' : ''}`
                }
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Panel de grupos ──────────────────────────────────────────────────────────
const GroupsPanel = ({ groups }) => {
  const queryClient   = useQueryClient();
  const [expanded,    setExpanded]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => docTypeService.createGroup({ name: newName.trim() }),
    onSuccess: () => { queryClient.invalidateQueries(['document-groups']); showToast.success('Grupo creado'); setNewName(''); },
    onError: (err) => showToast.error(err.response?.data?.message || 'El nombre ya existe'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => docTypeService.updateGroup(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-groups']);
      queryClient.invalidateQueries(['document-types']);
      showToast.success('Grupo actualizado'); setEditingId(null);
    },
    onError: (err) => showToast.error(err.response?.data?.message || 'El nombre ya existe'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => docTypeService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-groups']);
      queryClient.invalidateQueries(['document-types']);
      showToast.success('Grupo eliminado');
    },
    onError: () => showToast.error('Error al eliminar'),
  });

  const handleCreate = (e) => { e.preventDefault(); if (!newName.trim()) return; createMutation.mutate(); };
  const handleUpdate = (id) => { if (!editingName.trim()) return; updateMutation.mutate({ id, name: editingName.trim() }); };
  const handleDelete = (group) => {
    if (!confirm(`¿Eliminar el grupo "${group.name}"?`)) return;
    deleteMutation.mutate(group.id);
  };

  return (
    <div className="overflow-hidden bg-white border-2 border-violet-200 rounded-xl">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 transition-colors bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm bg-gradient-to-br from-violet-500 to-purple-600">
            <FolderOpen className="w-4 h-4 text-white"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900">Gestión de Grupos</p>
            <p className="text-xs text-gray-500">{groups.length} grupo{groups.length !== 1 ? 's' : ''} definido{groups.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
      </button>
      {expanded && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">Los grupos permiten organizar los documentos visualmente dentro de cada tipo de proveedor.</p>
          {groups.length > 0 && (
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${group.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <FolderOpen className="flex-shrink-0 w-4 h-4 text-violet-400"/>
                  {editingId === group.id ? (
                    <input value={editingName} onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(group.id); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus className="flex-1 px-2 py-1 text-sm border-2 rounded-lg border-violet-300 focus:outline-none focus:border-violet-500"/>
                  ) : (
                    <span className="flex-1 text-sm font-medium text-gray-800">{group.name}</span>
                  )}
                  <div className="flex items-center flex-shrink-0 gap-1">
                    {editingId === group.id ? (
                      <>
                        <button onClick={() => handleUpdate(group.id)} disabled={updateMutation.isPending} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Check className="w-3.5 h-3.5"/></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5"/></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(group.id); setEditingName(group.name); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Pencil className="w-3.5 h-3.5"/></button>
                        <button onClick={() => handleDelete(group)} disabled={deleteMutation.isPending} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleCreate} className="flex items-center gap-2 pt-1">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del nuevo grupo..." maxLength={100}
              className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
            <Button type="submit" size="sm" loading={createMutation.isPending} leftIcon={<Plus className="w-3.5 h-3.5"/>}
              className="text-white bg-violet-600 hover:bg-violet-700 whitespace-nowrap">Agregar</Button>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Modal crear/editar documento ─────────────────────────────────────────────
const DocumentModal = ({ document, providerTypes, groups, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit      = !!document;
  const [form, setForm] = useState({
    name:                document?.name               || '',
    code:                document?.code               || '',
    description:         document?.description        || '',
    category:            document?.category           || 'fiscal',
    group_name:          document?.group_name         || '',
    requires_expiry:     document?.requires_expiry    ?? false,
    expiry_alert_days:   document?.expiry_alert_days  || 30,
    expiry_months:       document?.expiry_months      || null,
    allows_multiple:     document?.allows_multiple    ?? false,
    allowed_extensions:  document?.allowed_extensions || '',
    max_file_size_mb:    document?.max_file_size_mb   || 10,
    is_active:           document?.is_active          ?? true,
    applies_to_existing: true,
    provider_type_ids:   document?.provider_types?.map(pt => pt.id) || [],
    is_required_map:     document?.provider_types?.reduce((acc, pt) => {
      acc[pt.id] = pt.pivot?.is_required ?? false; return acc;
    }, {}) || {},
  });
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleProviderType = (ptId) => {
    setForm(f => ({
      ...f,
      provider_type_ids: f.provider_type_ids.includes(ptId)
        ? f.provider_type_ids.filter(id => id !== ptId)
        : [...f.provider_type_ids, ptId],
    }));
  };
  const toggleRequired = (ptId) => {
    setForm(f => ({ ...f, is_required_map: { ...f.is_required_map, [ptId]: !f.is_required_map[ptId] } }));
  };

  const expiryPreview = useMemo(() => {
    if (!form.expiry_months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + form.expiry_months);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [form.expiry_months]);

  const mutation = useMutation({
    mutationFn: isEdit ? (data) => docTypeService.update(document.id, data) : docTypeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['document-types']);
      showToast.success(isEdit ? 'Documento actualizado' : 'Documento creado correctamente');
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al guardar'),
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    if (!form.name.trim())                   { setError('El nombre es obligatorio'); return; }
    if (form.provider_type_ids.length === 0) { setError('Asigna al menos un tipo de proveedor'); return; }
    mutation.mutate(form);
  };

  const activeGroups = groups.filter(g => g.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-to-br from-violet-500 to-purple-600">
              <FileText className="w-5 h-5 text-white"/>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Documento' : 'Nuevo Tipo de Documento'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ej. Constancia de Situación Fiscal"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Código <span className="font-normal text-gray-400">(opcional)</span></label>
              <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="Ej. CSF-001"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Descripción <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} maxLength={1000}
              placeholder="Instrucciones para el proveedor..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Categoría *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.filter(o => o.value !== 'technical').map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('category', opt.value)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.category === opt.value ? opt.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                <FolderOpen className="inline w-4 h-4 mr-1 text-violet-500"/>Grupo <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <select value={form.group_name} onChange={e => set('group_name', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400">
                <option value="">— Sin grupo —</option>
                {activeGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 space-y-4 border-2 border-gray-200 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500"/>¿Tiene fecha de vencimiento?</p>
                <p className="text-xs text-gray-400 mt-0.5">El proveedor deberá indicar la fecha de emisión</p>
              </div>
              <button type="button" onClick={() => { set('requires_expiry', !form.requires_expiry); if (form.requires_expiry) set('expiry_months', null); }}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${form.requires_expiry ? 'bg-amber-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.requires_expiry ? 'translate-x-6' : 'translate-x-0.5'}`}/>
              </button>
            </div>
            {form.requires_expiry && (
              <div className="pt-1 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {EXPIRY_PRESETS.map(opt => (
                    <button key={opt.months} type="button" onClick={() => set('expiry_months', form.expiry_months === opt.months ? null : opt.months)}
                      className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.expiry_months === opt.months ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-amber-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 text-xs text-gray-500">O manual:</span>
                  <input type="number" min={1} max={120}
                    value={EXPIRY_PRESETS.some(p => p.months === form.expiry_months) ? '' : (form.expiry_months || '')}
                    onChange={e => { const v = parseInt(e.target.value); set('expiry_months', v > 0 ? v : null); }}
                    placeholder="Ej. 18" className="w-20 px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 text-center"/>
                  <span className="text-xs text-gray-500">meses</span>
                </div>
                {form.expiry_months && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-amber-700">Si el proveedor sube hoy, vence el <span className="font-semibold capitalize">{expiryPreview}</span></p>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                  <label className="flex-shrink-0 text-sm text-gray-600">Alertar con</label>
                  <input type="number" value={form.expiry_alert_days} min={1} max={365}
                    onChange={e => set('expiry_alert_days', parseInt(e.target.value) || 30)}
                    className="w-20 px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 text-center"/>
                  <label className="text-sm text-gray-600">días de anticipación</label>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50">
              <input type="checkbox" checked={form.allows_multiple} onChange={e => set('allows_multiple', e.target.checked)} className="w-4 h-4 rounded text-violet-600"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Permite múltiples archivos</p>
                <p className="text-xs text-gray-400">El proveedor puede cargar más de uno</p>
              </div>
            </label>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">Tamaño máximo (MB)</label>
              <input type="number" value={form.max_file_size_mb} min={1} max={100}
                onChange={e => set('max_file_size_mb', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              <Users className="inline w-4 h-4 mr-1 text-violet-500"/>Asignar a tipos de proveedor *
            </label>
            <div className="space-y-2">
              {providerTypes.map(pt => {
                const selected = form.provider_type_ids.includes(pt.id);
                const isReq    = form.is_required_map[pt.id] ?? false;
                return (
                  <div key={pt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selected ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleProviderType(pt.id)} className="flex-shrink-0 w-4 h-4 rounded text-violet-600"/>
                    <p className={`text-sm font-medium flex-1 ${selected ? 'text-violet-800' : 'text-gray-600'}`}>{pt.name}</p>
                    {selected && (
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={isReq} onChange={() => toggleRequired(pt.id)} className="w-3.5 h-3.5 rounded text-red-500"/>
                        <span className={isReq ? 'text-red-600 font-semibold' : 'text-gray-500'}>Obligatorio</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {!isEdit && form.provider_type_ids.length > 0 && (
            <div className="p-4 border-2 rounded-xl border-amber-200 bg-amber-50">
              <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4"/>¿A quién aplica este nuevo documento?
              </p>
              <div className="space-y-2">
                {[
                  { val: true,  label: 'A todos los proveedores', desc: 'Los proveedores actuales verán este documento como pendiente' },
                  { val: false, label: 'Solo a proveedores nuevos', desc: 'Los proveedores ya registrados no se verán afectados' },
                ].map(opt => (
                  <label key={String(opt.val)} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer ${form.applies_to_existing === opt.val ? 'border-amber-400 bg-amber-100' : 'border-amber-200 bg-white'}`}>
                    <input type="radio" name="applies_to_existing" checked={form.applies_to_existing === opt.val}
                      onChange={() => set('applies_to_existing', opt.val)} className="mt-0.5 text-amber-600"/>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{opt.label}</p>
                      <p className="text-xs text-amber-600">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              {isEdit ? 'Guardar cambios' : 'Crear documento'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Tarjeta de documento ─────────────────────────────────────────────────────
const DocumentCard = ({ doc, onEdit, onToggle, onRemove, isDragging }) => {
  const catStyle = getCategoryStyle(doc.category);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border-2 bg-white transition-all ${!doc.is_active ? 'opacity-50 border-gray-200' : 'border-gray-200 hover:border-violet-200 hover:shadow-sm'} ${isDragging ? 'shadow-lg border-violet-300 rotate-1' : ''}`}>
      <div className="flex-shrink-0 text-gray-300 cursor-grab hover:text-gray-500"><GripVertical className="w-4 h-4"/></div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${doc.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{doc.name}</p>
          {doc.code && <span className="font-mono text-xs text-gray-400">({doc.code})</span>}
          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${catStyle}`}>
            {CATEGORY_OPTIONS.find(c => c.value === doc.category)?.label || doc.category}
          </span>
          {doc.is_required && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><AlertCircle className="w-2.5 h-2.5"/>Obligatorio</span>}
          {doc.requires_expiry && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-2.5 h-2.5"/>{doc.expiry_months ? `Vence (${doc.expiry_months}m)` : 'Vence'}</span>}
        </div>
        {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>}
        {doc.group_name   && <p className="text-xs text-violet-400 mt-0.5 flex items-center gap-1"><FolderOpen className="w-3 h-3"/>{doc.group_name}</p>}
      </div>
      <div className="flex items-center flex-shrink-0 gap-1">
        <button onClick={() => onEdit(doc)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={() => onToggle(doc)} className={`p-1.5 rounded-lg transition-colors ${doc.is_active ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}>
          {doc.is_active ? <ToggleRight className="w-4 h-4"/> : <ToggleLeft className="w-4 h-4"/>}
        </button>
        {onRemove && <button onClick={() => onRemove(doc)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>}
      </div>
    </div>
  );
};

// ─── Sección por tipo de proveedor ────────────────────────────────────────────
const ProviderTypeSection = ({ section, onEdit, onToggle, onRemove, onReorder }) => {
  const [expanded,    setExpanded]    = useState(true);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [docs,        setDocs]        = useState(section.documents || []);

  React.useEffect(() => { setDocs(section.documents || []); }, [section.documents]);

  const groups = useMemo(() => {
    const map = {};
    docs.forEach(d => { const g = d.group_name || 'Sin grupo'; if (!map[g]) map[g] = []; map[g].push(d); });
    return map;
  }, [docs]);

  const handleDrop = (idx) => {
    if (draggingIdx === null || draggingIdx === idx) { setDraggingIdx(null); setDragOverIdx(null); return; }
    const newDocs = [...docs];
    const [moved] = newDocs.splice(draggingIdx, 1);
    newDocs.splice(idx, 0, moved);
    setDocs(newDocs); setDraggingIdx(null); setDragOverIdx(null);
    onReorder(section.provider_type.id, newDocs.map(d => d.id));
  };

  return (
    <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 transition-colors bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm bg-gradient-to-br from-violet-500 to-purple-600"><Shield className="w-4 h-4 text-white"/></div>
          <div className="text-left">
            <p className="font-bold text-gray-900">{section.provider_type.name}</p>
            <p className="text-xs text-gray-500">{section.documents_count} documento{section.documents_count !== 1 ? 's' : ''} asignado{section.documents_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
      </button>
      {expanded && (
        <div className="p-4 space-y-4">
          {docs.length === 0 ? (
            <div className="py-8 text-center text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40"/><p className="text-sm">No hay documentos asignados</p></div>
          ) : (
            Object.entries(groups).map(([groupName, groupDocs]) => (
              <div key={groupName}>
                {groupName !== 'Sin grupo' && (
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FolderOpen className="w-3 h-3"/>{groupName}</p>
                )}
                <div className="space-y-2">
                  {groupDocs.map(doc => {
                    const globalIdx = docs.findIndex(d => d.id === doc.id);
                    return (
                      <div key={doc.id} draggable
                        onDragStart={() => setDraggingIdx(globalIdx)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverIdx(globalIdx); }}
                        onDrop={() => handleDrop(globalIdx)}
                        onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                        className={`transition-all ${dragOverIdx === globalIdx ? 'translate-y-1 opacity-60' : ''}`}>
                        <DocumentCard doc={doc} onEdit={onEdit} onToggle={onToggle}
                          onRemove={(d) => onRemove(d, section.provider_type.id)}
                          isDragging={draggingIdx === globalIdx}/>
                      </div>
                    );
                  })}
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
export const DocumentManagementPage = () => {
  const queryClient = useQueryClient();
  const [showModal,    setShowModal]    = useState(false);
  const [editDocument, setEditDocument] = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['document-types'], queryFn: docTypeService.getAll, staleTime: 60*1000 });
  const { data: ptData }    = useQuery({ queryKey: ['document-types-provider-types'], queryFn: docTypeService.getProviderTypes, staleTime: 5*60*1000 });
  const { data: groupsData} = useQuery({ queryKey: ['document-groups'], queryFn: docTypeService.getGroups, staleTime: 60*1000 });

  const providerTypes = ptData?.provider_types || [];
  const groups        = groupsData?.groups     || [];

  const templateDocs = useMemo(() => {
    if (!data?.provider_types) return [];
    const seen = new Set();
    const result = [];
    data.provider_types.forEach(section => {
      section.documents.forEach(doc => {
        if (TEMPLATE_DOC_CODES.includes(doc.code) && !seen.has(doc.id)) {
          seen.add(doc.id); result.push(doc);
        }
      });
    });
    return result;
  }, [data]);

  const toggleMutation  = useMutation({ mutationFn: (doc) => docTypeService.toggleActive(doc.id), onSuccess: (res) => { queryClient.invalidateQueries(['document-types']); showToast.success(res.message); }, onError: () => showToast.error('Error') });
  const removeMutation  = useMutation({ mutationFn: ({ id, provider_type_id }) => docTypeService.removeFromProviderType(id, provider_type_id), onSuccess: () => { queryClient.invalidateQueries(['document-types']); showToast.success('Removido'); }, onError: () => showToast.error('Error') });
  const reorderMutation = useMutation({ mutationFn: ({ provider_type_id, ordered_ids }) => docTypeService.reorder({ provider_type_id, ordered_ids }), onError: () => showToast.error('Error al reordenar') });

  const handleEdit    = (doc) => { setEditDocument(doc); setShowModal(true); };
  const handleToggle  = (doc) => toggleMutation.mutate(doc);
  const handleRemove  = (doc, ptId) => { if (!confirm(`¿Remover "${doc.name}"?`)) return; removeMutation.mutate({ id: doc.id, provider_type_id: ptId }); };
  const handleReorder = (ptId, orderedIds) => reorderMutation.mutate({ provider_type_id: ptId, ordered_ids: orderedIds });

  const filteredSections = useMemo(() => {
    if (!data?.provider_types) return [];
    return data.provider_types.map(section => ({
      ...section,
      documents: section.documents.filter(doc => {
        const matchSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase()) || (doc.code||'').toLowerCase().includes(search.toLowerCase());
        const matchCat    = !filterCat || doc.category === filterCat;
        const matchActive = showInactive || doc.is_active;
        return matchSearch && matchCat && matchActive;
      }),
    }));
  }, [data, search, filterCat, showInactive]);

  const totalDocs    = data?.provider_types?.reduce((s, sec) => s + sec.documents_count, 0) || 0;
  const activeDocs   = data?.provider_types?.reduce((s, sec) => s + sec.documents.filter(d => d.is_active).length, 0) || 0;
  const requiredDocs = data?.provider_types?.reduce((s, sec) => s + sec.documents.filter(d => d.is_required).length, 0) || 0;
  const expiryDocs   = data?.provider_types?.reduce((s, sec) => s + sec.documents.filter(d => d.requires_expiry).length, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-2 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-to-br from-violet-500 to-purple-600"><FileText className="w-6 h-6 text-white"/></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Documentos</h1>
            <p className="text-sm text-gray-600">Define y administra los documentos requeridos por tipo de proveedor</p>
          </div>
        </div>
        <Button onClick={() => { setEditDocument(null); setShowModal(true); }} leftIcon={<Plus className="w-4 h-4"/>}
          className="text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
          Nuevo documento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: totalDocs, color: 'violet' },
          { label: 'Activos', value: activeDocs, color: 'green' },
          { label: 'Obligatorios', value: requiredDocs, color: 'red' },
          { label: 'Con vencimiento', value: expiryDocs, color: 'amber' },
        ].map(s => (
          <div key={s.label} className={`p-4 bg-white border-2 border-${s.color}-200 rounded-xl`}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ✅ Panel de templates — singleFormat automático según código */}
      {templateDocs.map(doc => (
        <TemplatesPanel
          key={doc.id}
          documentTypeId={doc.id}
          documentTypeName={doc.name}
          singleFormat={doc.code === 'carta_no_trabajo_infantil'}
        />
      ))}

      <GroupsPanel groups={groups}/>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="flex-shrink-0 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..."
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent border-0 outline-none"/>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400"/>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="text-sm border-2 border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-400">
            <option value="">Todas las categorías</option>
            {CATEGORY_OPTIONS.filter(o => o.value !== 'technical').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${showInactive ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
          {showInactive ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
          {showInactive ? 'Ocultar inactivos' : 'Ver inactivos'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 rounded-full border-t-violet-500 animate-spin"/></div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map(section => (
            <ProviderTypeSection key={section.provider_type.id} section={section}
              onEdit={handleEdit} onToggle={handleToggle} onRemove={handleRemove} onReorder={handleReorder}/>
          ))}
          {data?.unassigned?.length > 0 && (
            <div className="p-4 bg-white border-2 border-gray-300 border-dashed rounded-xl">
              <p className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
                <AlertCircle className="w-4 h-4 text-amber-500"/>Documentos sin asignar ({data.unassigned.length})
              </p>
              <div className="space-y-2">
                {data.unassigned.map(doc => <DocumentCard key={doc.id} doc={doc} onEdit={handleEdit} onToggle={handleToggle} onRemove={null}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 border border-blue-200 bg-blue-50 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">Arrastra los documentos para reordenarlos. Crea grupos primero y luego asígnalos desde el modal de edición.</p>
      </div>

      {showModal && (
        <DocumentModal document={editDocument} providerTypes={providerTypes} groups={groups}
          onClose={() => { setShowModal(false); setEditDocument(null); }}/>
      )}
    </div>
  );
};
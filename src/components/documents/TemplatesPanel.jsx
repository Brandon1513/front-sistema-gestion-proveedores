import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../common/Button';
import { showToast } from '../../utils/toast';
import { templateService } from '../../api/templateService';
import { TEMPLATE_TYPES } from '../../constants/documentTypeConstants';
import {
  ChevronDown, ChevronUp, FileBadge, FileText, Download, Trash2,
  FileUp, AlertCircle, Search, X, CheckSquare, Square, Check,
} from 'lucide-react';

export const TemplatesPanel = ({ documentTypeId, documentTypeName, singleFormat = false }) => {
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

          {isLoading ? (
            <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 rounded-full border-t-emerald-500 animate-spin"/></div>
          ) : templates.length > 0 ? (
            <div className="space-y-2">
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

          <div className="pt-4 border-t-2 border-gray-100">
            <p className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-800">
              <FileUp className="w-4 h-4 text-emerald-500"/>
              {singleFormat
                ? templates.length > 0 ? 'Reemplazar formato' : 'Subir formato'
                : 'Subir nuevo formato'
              }
            </p>

            {singleFormat && templates.length > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 border border-amber-200 rounded-xl bg-amber-50">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700">
                  Al subir un nuevo archivo se <span className="font-semibold">reemplazará</span> el formato actual. Los proveedores verán el nuevo archivo al descargar.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

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
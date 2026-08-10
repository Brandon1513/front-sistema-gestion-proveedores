import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import { docTypeService } from '../../api/docTypeService';
import { TEMPLATE_DOC_CODES, CATEGORY_OPTIONS } from '../../constants/documentTypeConstants';
import { TemplatesPanel } from '../../components/documents/TemplatesPanel';
import { GroupsPanel } from '../../components/documents/GroupsPanel';
import { DocumentTypeModal } from '../../components/documents/DocumentTypeModal';
import { DocumentCard } from '../../components/documents/DocumentCard';
import { ProviderTypeSection } from '../../components/documents/ProviderTypeSection';
import {
  FileText, Plus, AlertCircle, Search, Filter, Eye, EyeOff, Info,
} from 'lucide-react';

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

  // ✅ Ahora incluye tanto los códigos viejos hardcodeados (carta_garantia,
  // carta_no_trabajo_infantil) COMO cualquier documento nuevo marcado
  // is_product_specific desde el modal.
  const templateDocs = useMemo(() => {
    if (!data?.provider_types) return [];
    const seen = new Set();
    const result = [];
    data.provider_types.forEach(section => {
      section.documents.forEach(doc => {
        const isLegacy         = TEMPLATE_DOC_CODES.includes(doc.code);
        const isProductSpecific = doc.is_product_specific && !isLegacy;
        if ((isLegacy || isProductSpecific) && !seen.has(doc.id)) {
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

      {/* Panel de plantillas por producto — legacy (código fijo) + nuevos (is_product_specific) */}
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
        <DocumentTypeModal document={editDocument} providerTypes={providerTypes} groups={groups}
          onClose={() => { setShowModal(false); setEditDocument(null); }}/>
      )}
    </div>
  );
};
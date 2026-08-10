import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Shield, FileText, FolderOpen } from 'lucide-react';
import { DocumentCard } from './DocumentCard';

export const ProviderTypeSection = ({ section, onEdit, onToggle, onRemove, onReorder }) => {
  const [expanded,    setExpanded]    = useState(true);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [docs,        setDocs]        = useState(section.documents || []);

  useEffect(() => { setDocs(section.documents || []); }, [section.documents]);

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
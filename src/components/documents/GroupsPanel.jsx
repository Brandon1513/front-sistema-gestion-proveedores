import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../common/Button';
import { showToast } from '../../utils/toast';
import { docTypeService } from '../../api/docTypeService';
import { ChevronDown, ChevronUp, FolderOpen, Check, X, Pencil, Trash2, Plus } from 'lucide-react';

export const GroupsPanel = ({ groups }) => {
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
import React from 'react';
import {
  GripVertical, AlertCircle, Clock, FolderOpen,
  Edit2, ToggleLeft, ToggleRight, Trash2,
} from 'lucide-react';
import { CATEGORY_OPTIONS, getCategoryStyle } from '../../constants/documentTypeConstants';

export const DocumentCard = ({ doc, onEdit, onToggle, onRemove, isDragging }) => {
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
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../common/Button';
import { showToast } from '../../utils/toast';
import { docTypeService } from '../../api/docTypeService';
import { GenericTemplatesSection } from './GenericTemplatesSection';
import { CATEGORY_OPTIONS, EXPIRY_PRESETS } from '../../constants/documentTypeConstants';
import {
  FileText, X, FolderOpen, Clock, Calendar, Users, AlertCircle, Package, Info,
} from 'lucide-react';

export const DocumentTypeModal = ({ document, providerTypes, groups, onClose }) => {
  const queryClient = useQueryClient();
  const wasEditingFromStart = !!document;

  const [createdDocument, setCreatedDocument] = useState(null);
  const activeDocument = document || createdDocument;
  const isEditing = !!activeDocument;

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
    is_product_specific: document?.is_product_specific ?? false, // ✅ NUEVO
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

  // ✅ Ser "por producto" implica "múltiples archivos" — se sube uno por
  // cada producto que el proveedor tenga registrado. Lo forzamos junto.
  const toggleProductSpecific = () => {
    setForm(f => {
      const next = !f.is_product_specific;
      return { ...f, is_product_specific: next, allows_multiple: next ? true : f.allows_multiple };
    });
  };

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
    mutationFn: (data) => activeDocument
      ? docTypeService.update(activeDocument.id, data)
      : docTypeService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['document-types']);
      if (!activeDocument) {
        setCreatedDocument(res.document);
        showToast.success(
          form.is_product_specific
            ? 'Documento creado. Asigna las plantillas por producto desde el panel principal.'
            : 'Documento creado. Ya puedes adjuntar plantillas de apoyo si lo necesitas.'
        );
      } else {
        showToast.success('Documento actualizado');
        onClose();
      }
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
            <h2 className="text-xl font-bold text-gray-900">
              {wasEditingFromStart ? 'Editar Documento' : createdDocument ? 'Documento creado' : 'Nuevo Tipo de Documento'}
            </h2>
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

          {/* ✅ NUEVO — ¿Aplica por producto específico? */}
          <div className="p-4 space-y-3 border-2 border-teal-200 rounded-xl bg-teal-50">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <p className="text-sm font-semibold text-teal-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-600"/>¿Este documento aplica por producto específico?
                </p>
                <p className="text-xs text-teal-600 mt-0.5">
                  El proveedor deberá elegir de sus propios productos registrados y subir un archivo por cada uno
                  (por ejemplo: cartas garantía distintas según el producto que vende). Solo verá los productos que
                  él mismo tiene dados de alta.
                </p>
              </div>
              <button type="button" onClick={toggleProductSpecific}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${form.is_product_specific ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_product_specific ? 'translate-x-6' : 'translate-x-0.5'}`}/>
              </button>
            </div>
            {form.is_product_specific && (
              <div className="flex items-start gap-2 p-2.5 border border-teal-300 rounded-lg bg-white">
                <Info className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-teal-700">
                  Después de guardar, ve al panel <strong>"Formatos de {form.name || 'este documento'}"</strong> en la
                  vista principal de Gestión de Documentos para asignar una plantilla por cada producto (opcional).
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className={`flex items-center gap-3 p-3 border-2 rounded-xl ${form.is_product_specific ? 'border-gray-100 bg-gray-100 cursor-not-allowed opacity-70' : 'border-gray-200 cursor-pointer hover:bg-gray-50'}`}>
              <input type="checkbox" checked={form.allows_multiple}
                onChange={e => set('allows_multiple', e.target.checked)}
                disabled={form.is_product_specific}
                className="w-4 h-4 rounded text-violet-600"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Permite múltiples archivos</p>
                <p className="text-xs text-gray-400">
                  {form.is_product_specific ? 'Activado automáticamente (aplica por producto)' : 'El proveedor puede cargar más de uno'}
                </p>
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

          {/* ✅ Plantillas de apoyo simples — solo si NO es por producto.
              Si es por producto, se gestionan desde el panel principal
              (TemplatesPanel), no aquí. */}
          {isEditing && !form.is_product_specific && (
            <GenericTemplatesSection documentTypeId={activeDocument.id} />
          )}

          {!wasEditingFromStart && !createdDocument && form.provider_type_ids.length > 0 && (
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
              {wasEditingFromStart ? 'Guardar cambios' : createdDocument ? 'Guardar cambios' : 'Crear documento'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              {createdDocument ? 'Cerrar' : 'Cancelar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
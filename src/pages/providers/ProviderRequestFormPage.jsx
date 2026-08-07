import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { departmentService } from '../../api/departmentService';
import { providerTypeService } from '../../api/providerTypeService';
import { providerRequestService } from '../../api/providerRequestService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import { Send, Building2, User, Phone, Mail, Tag, FileText, AlertCircle } from 'lucide-react';

export const ProviderRequestFormPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    department_id:          '',
    provider_type_id:       '',
    provider_business_name: '',
    provider_contact_name:  '',
    provider_contact_phone: '',
    provider_contact_email: '',
    notes:                  '',
  });
  const [error, setError] = useState('');

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
    staleTime: 10 * 60 * 1000,
  });
  const departments = deptData?.departments || [];

  const { data: typesData } = useQuery({
    queryKey: ['provider-types'],
    queryFn: providerTypeService.getAll,
    staleTime: 10 * 60 * 1000,
  });
  const providerTypes = typesData?.provider_types || [];

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: () => providerRequestService.create(form),
    onSuccess: () => {
      showToast.success('Solicitud enviada correctamente');
      navigate('/my-requests');
    },
    onError: (err) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : (err.response?.data?.message || 'Error al enviar la solicitud'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
          <Send className="w-6 h-6 text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitar Alta de Proveedor</h1>
          <p className="text-sm text-gray-600">El equipo de Compras revisará tu solicitud y enviará la invitación al proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            <Tag className="inline w-4 h-4 mr-1 text-primary-600"/>Departamento *
          </label>
          <select value={form.department_id} onChange={e => set('department_id', e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">
            <option value="">Selecciona tu departamento...</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            <Tag className="inline w-4 h-4 mr-1 text-primary-600"/>Tipo de proveedor *
          </label>
          <select value={form.provider_type_id} onChange={e => set('provider_type_id', e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500">
            <option value="">Selecciona el tipo...</option>
            {providerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="mb-3 text-xs font-bold tracking-wide text-gray-500 uppercase">Datos del proveedor a invitar</p>

          <div className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                <Building2 className="inline w-4 h-4 mr-1 text-primary-600"/>Razón social del proveedor *
              </label>
              <input type="text" value={form.provider_business_name} onChange={e => set('provider_business_name', e.target.value)} required
                placeholder="Nombre de la empresa proveedora"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                <User className="inline w-4 h-4 mr-1 text-primary-600"/>Nombre de contacto *
              </label>
              <input type="text" value={form.provider_contact_name} onChange={e => set('provider_contact_name', e.target.value)} required
                placeholder="Persona con quien tienes contacto en el proveedor"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  <Phone className="inline w-4 h-4 mr-1 text-primary-600"/>Teléfono de contacto *
                </label>
                <input type="text" value={form.provider_contact_phone} onChange={e => set('provider_contact_phone', e.target.value)} required
                  placeholder="33 1234 5678"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  <Mail className="inline w-4 h-4 mr-1 text-primary-600"/>Correo de contacto *
                </label>
                <input type="email" value={form.provider_contact_email} onChange={e => set('provider_contact_email', e.target.value)} required
                  placeholder="contacto@proveedor.com"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"/>
                <p className="mt-1 text-xs text-gray-400">A este correo se enviará la invitación de registro</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            <FileText className="inline w-4 h-4 mr-1 text-primary-600"/>Observaciones <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} maxLength={2000}
            placeholder="Contexto adicional para el equipo de Compras..."
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"/>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 border border-red-200 rounded-xl bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/my-requests')} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending} leftIcon={<Send className="w-4 h-4"/>}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </div>
  );
};
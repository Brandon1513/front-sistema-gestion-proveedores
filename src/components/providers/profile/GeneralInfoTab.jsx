import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { providerService } from '../../../api/providerService';
import { showToast } from '../../../utils/toast';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Edit2, Save, X, MapPin, Phone, CreditCard, Building2 } from 'lucide-react';

const MEXICAN_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México',
  'Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit',
  'Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
  'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas',
];

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</span>
    <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
      {value || <span className="italic text-gray-400">No especificado</span>}
    </span>
  </div>
);

export const GeneralInfoTab = ({ provider, canEdit = false }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [errors,    setErrors]    = useState({});

  const [form, setForm] = useState({
    business_name:        provider.business_name        || '',
    rfc:                  provider.rfc                  || '',
    tipo_persona:         provider.tipo_persona         || (provider.rfc?.length === 13 ? 'fisica' : 'moral'),
    legal_representative: provider.legal_representative || '',
    phone:                provider.phone                || '',
    email:                provider.email                || '',
    street:               provider.street               || '',
    exterior_number:      provider.exterior_number      || '',
    interior_number:      provider.interior_number      || '',
    neighborhood:         provider.neighborhood         || '',
    city:                 provider.city                 || '',
    state:                provider.state                || '',
    postal_code:          provider.postal_code          || '',
    bank:                 provider.bank                 || '',
    bank_branch:          provider.bank_branch          || '',
    account_number:       provider.account_number       || '',
    clabe:                provider.clabe                || '',
    credit_amount:        provider.credit_amount        || '',
    credit_days:          provider.credit_days          || '',
    observations:         provider.observations         || '',
  });

  const mutation = useMutation({
    mutationFn: (data) => providerService.update(provider.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', provider.id], exact: false });
      showToast.success('Información actualizada correctamente');
      setIsEditing(false);
      setErrors({});
    },
    onError: (err) => {
      const apiErrors = err.response?.data?.errors || {};
      setErrors(apiErrors);
      showToast.error(err.response?.data?.message || 'Error al actualizar');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Auto-detectar tipo_persona al editar RFC
    if (name === 'rfc') {
      const rfcUpper = value.toUpperCase();
      const tipoPersona = rfcUpper.length === 13 ? 'fisica' : 'moral';
      setForm(f => ({ ...f, rfc: rfcUpper, tipo_persona: tipoPersona }));
      if (errors.rfc) setErrors(p => ({ ...p, rfc: null }));
      return;
    }

    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleCancel = () => {
    setForm({
      business_name:        provider.business_name        || '',
      rfc:                  provider.rfc                  || '',
      tipo_persona:         provider.tipo_persona         || (provider.rfc?.length === 13 ? 'fisica' : 'moral'),
      legal_representative: provider.legal_representative || '',
      phone:                provider.phone                || '',
      email:                provider.email                || '',
      street:               provider.street               || '',
      exterior_number:      provider.exterior_number      || '',
      interior_number:      provider.interior_number      || '',
      neighborhood:         provider.neighborhood         || '',
      city:                 provider.city                 || '',
      state:                provider.state                || '',
      postal_code:          provider.postal_code          || '',
      bank:                 provider.bank                 || '',
      bank_branch:          provider.bank_branch          || '',
      account_number:       provider.account_number       || '',
      clabe:                provider.clabe                || '',
      credit_amount:        provider.credit_amount        || '',
      credit_days:          provider.credit_days          || '',
      observations:         provider.observations         || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const selectClass = "w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 bg-white";

  // ── Modo lectura ──────────────────────────────────────────────────────────
  if (!isEditing) {
    const tipoPersona = provider.tipo_persona || (provider.rfc?.length === 13 ? 'fisica' : 'moral');
    return (
      <div className="space-y-6">
        {canEdit && (
          <div className="flex justify-end">
            <Button variant="secondary" leftIcon={<Edit2 className="w-4 h-4"/>} onClick={() => setIsEditing(true)}>
              Editar información
            </Button>
          </div>
        )}

        {/* Identificación */}
        <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
            <Building2 className="w-4 h-4 text-primary-500"/>Identificación
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Razón Social"          value={provider.business_name} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">RFC</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-gray-900">{provider.rfc}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                  tipoPersona === 'fisica'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  {tipoPersona === 'fisica' ? '👤 Persona Física' : '🏢 Persona Moral'}
                </span>
              </div>
            </div>
            <InfoRow label="Representante Legal" value={provider.legal_representative} />
          </div>
        </div>

        {/* Contacto */}
        <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
            <Phone className="w-4 h-4 text-primary-500"/>Contacto
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Teléfono" value={provider.phone} />
            <InfoRow label="Correo"   value={provider.email} />
          </div>
        </div>

        {/* Dirección */}
        <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
            <MapPin className="w-4 h-4 text-primary-500"/>Dirección
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Calle"         value={provider.street} />
            <InfoRow label="No. Exterior"  value={provider.exterior_number} />
            <InfoRow label="No. Interior"  value={provider.interior_number} />
            <InfoRow label="Colonia"       value={provider.neighborhood} />
            <InfoRow label="Ciudad"        value={provider.city} />
            <InfoRow label="Estado"        value={provider.state} />
            <InfoRow label="Código Postal" value={provider.postal_code} />
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
            <CreditCard className="w-4 h-4 text-primary-500"/>Datos Bancarios
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Banco"          value={provider.bank} />
            <InfoRow label="Sucursal"       value={provider.bank_branch} />
            <InfoRow label="No. de Cuenta"  value={provider.account_number} mono />
            <InfoRow label="CLABE"          value={provider.clabe} mono />
          </div>
        </div>

        {/* Crédito */}
        {(provider.credit_amount || provider.credit_days) && (
          <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
            <h3 className="text-sm font-bold tracking-wide text-gray-700 uppercase">Crédito</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Monto de Crédito" value={provider.credit_amount ? `$${parseFloat(provider.credit_amount).toLocaleString('es-MX')}` : null} />
              <InfoRow label="Días de Crédito"  value={provider.credit_days ? `${provider.credit_days} días` : null} />
            </div>
          </div>
        )}

        {provider.observations && (
          <div className="p-5 bg-white border-2 border-gray-100 rounded-xl">
            <h3 className="mb-2 text-sm font-bold tracking-wide text-gray-700 uppercase">Observaciones</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{provider.observations}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Modo edición ──────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Editando información general</h3>
        <div className="flex gap-2">
          <Button type="submit" loading={mutation.isPending} leftIcon={<Save className="w-4 h-4"/>}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" leftIcon={<X className="w-4 h-4"/>} onClick={handleCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
        </div>
      </div>

      {/* Identificación */}
      <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
          <Building2 className="w-4 h-4 text-primary-500"/>Identificación
        </h3>
        <Input label="Razón Social *" name="business_name" value={form.business_name}
          onChange={handleChange} error={errors.business_name?.[0]} required />

        {/* RFC + tipo persona */}
        <div>
          <Input label="RFC *" name="rfc" value={form.rfc} onChange={handleChange}
            error={errors.rfc?.[0]} maxLength={13} required
            helperText="12 caracteres = Persona Moral · 13 caracteres = Persona Física"
            className="font-mono uppercase" />

          {form.rfc.length >= 12 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                form.tipo_persona === 'fisica'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {form.tipo_persona === 'fisica' ? '👤 Persona Física' : '🏢 Persona Moral'}
                <span className="ml-1 opacity-50">({form.rfc.length} chars)</span>
              </div>
              <select
                value={form.tipo_persona}
                onChange={e => setForm(f => ({ ...f, tipo_persona: e.target.value }))}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-primary-400 text-gray-600">
                <option value="moral">Persona Moral</option>
                <option value="fisica">Persona Física</option>
              </select>
            </div>
          )}

          {form.tipo_persona === 'fisica' && form.rfc.length >= 12 && (
            <div className="flex items-start gap-2 p-3 mt-2 border bg-amber-50 border-amber-200 rounded-xl">
              <span className="flex-shrink-0 text-sm text-amber-500">⚠️</span>
              <p className="text-xs text-amber-700">
                Al ser Persona Física, algunos documentos como el <strong>Acta Constitutiva</strong>{' '}
                pueden no aplicar según la configuración del tipo de proveedor.
              </p>
            </div>
          )}
        </div>

        <Input label="Representante Legal" name="legal_representative" value={form.legal_representative}
          onChange={handleChange} error={errors.legal_representative?.[0]} />
      </div>

      {/* Contacto */}
      <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
          <Phone className="w-4 h-4 text-primary-500"/>Contacto
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Teléfono *"           name="phone" value={form.phone} onChange={handleChange} error={errors.phone?.[0]} required />
          <Input label="Correo Electrónico *" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email?.[0]} required />
        </div>
      </div>

      {/* Dirección */}
      <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
          <MapPin className="w-4 h-4 text-primary-500"/>Dirección
        </h3>
        <Input label="Calle *" name="street" value={form.street} onChange={handleChange} error={errors.street?.[0]} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="No. Exterior *" name="exterior_number" value={form.exterior_number} onChange={handleChange} error={errors.exterior_number?.[0]} required />
          <Input label="No. Interior"   name="interior_number" value={form.interior_number} onChange={handleChange} error={errors.interior_number?.[0]} />
        </div>
        <Input label="Colonia *"       name="neighborhood" value={form.neighborhood} onChange={handleChange} error={errors.neighborhood?.[0]} required />
        <Input label="Código Postal *" name="postal_code"  value={form.postal_code}  onChange={handleChange} error={errors.postal_code?.[0]}  required maxLength={10} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Estado *</label>
            <select name="state" value={form.state} onChange={handleChange} className={selectClass}>
              <option value="">Selecciona un estado...</option>
              {MEXICAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state?.[0] && <p className="mt-1 text-xs text-red-600">{errors.state[0]}</p>}
          </div>
          <Input label="Ciudad *" name="city" value={form.city} onChange={handleChange} error={errors.city?.[0]} required />
        </div>
      </div>

      {/* Datos bancarios */}
      <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-700 uppercase">
          <CreditCard className="w-4 h-4 text-primary-500"/>Datos Bancarios
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Banco"         name="bank"           value={form.bank}           onChange={handleChange} error={errors.bank?.[0]} />
          <Input label="Sucursal"      name="bank_branch"    value={form.bank_branch}    onChange={handleChange} error={errors.bank_branch?.[0]} />
          <Input label="No. de Cuenta" name="account_number" value={form.account_number} onChange={handleChange} error={errors.account_number?.[0]} />
          <Input label="CLABE"         name="clabe"          value={form.clabe}          onChange={handleChange} error={errors.clabe?.[0]} maxLength={18} />
        </div>
      </div>

      {/* Crédito */}
      <div className="p-5 space-y-4 bg-white border-2 border-gray-100 rounded-xl">
        <h3 className="text-sm font-bold tracking-wide text-gray-700 uppercase">Crédito</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Monto de Crédito" name="credit_amount" type="number" value={form.credit_amount} onChange={handleChange} error={errors.credit_amount?.[0]} min={0} step="0.01" />
          <Input label="Días de Crédito"  name="credit_days"   type="number" value={form.credit_days}   onChange={handleChange} error={errors.credit_days?.[0]}   min={0} />
        </div>
      </div>

      {/* Observaciones */}
      <div className="p-5 bg-white border-2 border-gray-100 rounded-xl">
        <label className="block mb-2 text-sm font-bold tracking-wide text-gray-700 uppercase">Observaciones</label>
        <textarea name="observations" value={form.observations} onChange={handleChange} rows={4}
          className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"
          placeholder="Notas adicionales sobre el proveedor..."/>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending} leftIcon={<Save className="w-4 h-4"/>} className="flex-1">
          Guardar cambios
        </Button>
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
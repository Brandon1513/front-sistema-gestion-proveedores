import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { providerProfileService } from '../../../api/providerProfileService';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import {
  Building2, Mail, Phone, MapPin, Save, X, Edit2,
  AlertCircle, CreditCard, Package, User,
} from 'lucide-react';
import { showToast } from '../../../utils/toast';

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos',
  'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

const CIUDADES_POR_ESTADO = {
  'Jalisco':    ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Tlajomulco de Zúñiga', 'El Salto', 'Puerto Vallarta', 'Lagos de Moreno', 'Tepatitlán', 'Zapotlanejo', 'Otra'],
  'México':     ['Toluca', 'Ecatepec', 'Naucalpan', 'Tlalnepantla', 'Nezahualcóyotl', 'Otra'],
  'Nuevo León': ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'Otra'],
};

// ─── Sección reutilizable ─────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children }) => (
  <div className="p-5 bg-white border-2 border-gray-200 rounded-xl">
    <h3 className="flex items-center gap-2 mb-4 text-base font-bold text-gray-900">
      <Icon className="w-5 h-5 text-primary-600" />
      {title}
    </h3>
    {children}
  </div>
);

export const GeneralInfoTab = ({ provider }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const buildForm = (p) => ({
    // Empresa
    business_name:      p?.business_name       || '',
    rfc:                p?.rfc                 || '',
    legal_representative: p?.legal_representative || '',
    // Contacto
    phone:              p?.phone               || '',
    // Dirección
    street:             p?.street              || '',
    exterior_number:    p?.exterior_number     || '',
    interior_number:    p?.interior_number     || '',
    neighborhood:       p?.neighborhood        || '',
    city:               p?.city               || '',
    state:              p?.state              || 'Jalisco',
    postal_code:        p?.postal_code        || '',
    country:            p?.country            || 'México',
    // Bancaria
    bank:               p?.bank               || '',
    bank_branch:        p?.bank_branch        || '',
    account_number:     p?.account_number     || '',
    clabe:              p?.clabe              || '',
    // Crédito
    credit_amount:      p?.credit_amount      || '',
    credit_days:        p?.credit_days        || '',
    // Productos y servicios
    products:           p?.products           || '',
    services:           p?.services           || '',
  });

  const [formData, setFormData]     = useState(buildForm(provider));
  const [customCity, setCustomCity] = useState('');

  const updateMutation = useMutation({
    mutationFn: providerProfileService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-profile']);
      setIsEditing(false);
      showToast.success('✓ Información actualizada correctamente');
    },
    onError: (error) => {
      showToast.error(error.response?.data?.message || 'Error al actualizar información');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'postal_code') {
      setFormData({ ...formData, [name]: value.replace(/[^0-9]/g, '').slice(0, 5) });
      return;
    }
    if (name === 'clabe') {
      setFormData({ ...formData, [name]: value.replace(/[^0-9]/g, '').slice(0, 18) });
      return;
    }
    if (name === 'credit_days') {
      setFormData({ ...formData, [name]: value.replace(/[^0-9]/g, '') });
      return;
    }
    if (name === 'state') {
      setFormData({ ...formData, state: value, city: '' });
      setCustomCity('');
      return;
    }
    if (name === 'city' && value === 'Otra') {
      setFormData({ ...formData, city: '' });
      setCustomCity('');
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleCustomCityChange = (e) => {
    setCustomCity(e.target.value);
    setFormData({ ...formData, city: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData(buildForm(provider));
    setCustomCity('');
    setIsEditing(false);
  };

  const getCiudades          = () => CIUDADES_POR_ESTADO[formData.state] || ['Otra'];
  const ciudadEsPersonalizada = () => {
    const ciudades = getCiudades();
    return formData.city && !ciudades.includes(formData.city);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Building2 className="w-6 h-6 text-primary-600" />
              Información General
            </h2>
            <p className="mt-1 text-sm text-gray-600">Datos básicos de tu empresa</p>
          </div>
          {!isEditing && (
            <Button variant="primary" leftIcon={<Edit2 className="w-4 h-4" />} onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Datos de la Empresa ── */}
        <Section icon={Building2} title="Datos de la Empresa">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Razón Social" name="business_name" value={formData.business_name} onChange={handleChange} disabled={!isEditing} required placeholder="Nombre de la empresa" />
            <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleChange} disabled={!isEditing} required placeholder="XAXX010101000" helperText="12 o 13 caracteres" />
            <Input label="Representante Legal" name="legal_representative" value={formData.legal_representative} onChange={handleChange} disabled={!isEditing} placeholder="Nombre completo del representante" leftIcon={<User className="w-4 h-4 text-gray-400" />} />
          </div>
        </Section>

        {/* ── Contacto ── */}
        <Section icon={Phone} title="Información de Contacto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Correo Electrónico" type="email" value={provider?.email || ''} disabled leftIcon={<Mail className="w-5 h-5 text-gray-400" />} helperText="El correo no se puede modificar" />
            <Input label="Teléfono" type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} placeholder="33 1234 5678" leftIcon={<Phone className="w-5 h-5 text-gray-400" />} />
          </div>
        </Section>

        {/* ── Dirección ── */}
        <Section icon={MapPin} title="Dirección">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Input label="Calle" name="street" value={formData.street} onChange={handleChange} disabled={!isEditing} placeholder="Av. Principal" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="No. Ext" name="exterior_number" value={formData.exterior_number} onChange={handleChange} disabled={!isEditing} placeholder="123" />
                <Input label="No. Int" name="interior_number" value={formData.interior_number} onChange={handleChange} disabled={!isEditing} placeholder="A" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Colonia" name="neighborhood" value={formData.neighborhood} onChange={handleChange} disabled={!isEditing} placeholder="Centro" />
              <Input label="Código Postal" name="postal_code" value={formData.postal_code} onChange={handleChange} disabled={!isEditing} placeholder="45000" maxLength={5} required helperText={isEditing ? 'Solo números, 5 dígitos' : ''} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Estado<span className="ml-1 text-red-500">*</span></label>
                {isEditing ? (
                  <select name="state" value={formData.state} onChange={handleChange} required className="w-full px-4 py-3 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">Selecciona un estado</option>
                    {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                ) : (
                  <input type="text" value={formData.state} disabled className="w-full px-4 py-3 text-gray-500 border-2 border-gray-300 rounded-xl bg-gray-50" />
                )}
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Ciudad<span className="ml-1 text-red-500">*</span></label>
                {isEditing ? (
                  <div className="space-y-2">
                    <select name="city" value={ciudadEsPersonalizada() ? 'Otra' : formData.city} onChange={handleChange} required={!ciudadEsPersonalizada()} className="w-full px-4 py-3 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      <option value="">Selecciona una ciudad</option>
                      {getCiudades().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {(formData.city === '' && getCiudades().includes('Otra')) || ciudadEsPersonalizada() ? (
                      <input type="text" value={ciudadEsPersonalizada() ? formData.city : customCity} onChange={handleCustomCityChange} placeholder="Escribe tu ciudad" required className="w-full px-4 py-3 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    ) : null}
                  </div>
                ) : (
                  <input type="text" value={formData.city} disabled className="w-full px-4 py-3 text-gray-500 border-2 border-gray-300 rounded-xl bg-gray-50" />
                )}
              </div>
              <Input label="País" name="country" value={formData.country} onChange={handleChange} disabled={!isEditing} />
            </div>
          </div>
        </Section>

        {/* ── Información Bancaria ── */}
        <Section icon={CreditCard} title="Información Bancaria">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Banco" name="bank" value={formData.bank} onChange={handleChange} disabled={!isEditing} placeholder="BBVA, Banamex, Santander..." leftIcon={<CreditCard className="w-4 h-4 text-gray-400" />} />
            <Input label="Sucursal" name="bank_branch" value={formData.bank_branch} onChange={handleChange} disabled={!isEditing} placeholder="Nombre o número de sucursal" />
            <Input label="Número de Cuenta" name="account_number" value={formData.account_number} onChange={handleChange} disabled={!isEditing} placeholder="Número de cuenta bancaria" />
            <Input label="CLABE" name="clabe" value={formData.clabe} onChange={handleChange} disabled={!isEditing} placeholder="18 dígitos" helperText={isEditing ? 'Solo números, 18 dígitos' : ''} maxLength={18} />
          </div>
        </Section>

        {/* ── Crédito ── */}
        <Section icon={CreditCard} title="Información Crediticia">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Monto de Crédito</label>
              <div className="relative">
                <span className="absolute text-sm font-medium text-gray-400 -translate-y-1/2 left-3 top-1/2">$</span>
                <input
                  type="number" name="credit_amount" value={formData.credit_amount}
                  onChange={handleChange} disabled={!isEditing}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full py-3 pr-4 transition-all border-2 border-gray-300 pl-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <Input label="Días de Crédito" name="credit_days" value={formData.credit_days} onChange={handleChange} disabled={!isEditing} placeholder="Ej: 30" helperText={isEditing ? 'Número de días' : ''} />
          </div>
        </Section>

        {/* ── Productos y Servicios ── */}
        <Section icon={Package} title="Productos y Servicios">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Productos</label>
              <textarea name="products" value={formData.products} onChange={handleChange} disabled={!isEditing}
                placeholder="Describe los productos que ofreces..." rows={3}
                className="w-full px-4 py-3 text-sm transition-all border-2 border-gray-300 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Servicios</label>
              <textarea name="services" value={formData.services} onChange={handleChange} disabled={!isEditing}
                placeholder="Describe los servicios que ofreces..." rows={3}
                className="w-full px-4 py-3 text-sm transition-all border-2 border-gray-300 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </Section>

        {/* Tip cuando no está editando */}
        {!isEditing && (
          <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="mb-1 font-medium">Mantén tu información actualizada</p>
                <p>Es importante que los datos de tu empresa estén siempre al día para una mejor comunicación.</p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        {isEditing && (
          <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
            <Button type="button" variant="ghost" leftIcon={<X className="w-4 h-4" />} onClick={handleCancel}>Cancelar</Button>
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} loading={updateMutation.isPending}>Guardar Cambios</Button>
          </div>
        )}
      </form>
    </div>
  );
};
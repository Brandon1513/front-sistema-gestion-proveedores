import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { providerService } from '../../api/providerService';
import { providerTypeService } from '../../api/providerTypeService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { showToast } from '../../utils/toast';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Plus, Trash2, Building2, MapPin,
  Phone, CreditCard, FileText, Users, AlertCircle,
  Package, Wrench, Search, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Constantes de dirección ──────────────────────────────────────────────────
const ESTADOS_MEXICO = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche',
  'Chiapas','Chihuahua','Coahuila','Colima','Durango','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','CDMX','Michoacán','Morelos',
  'Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo',
  'San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas',
  'Tlaxcala','Veracruz','Yucatán','Zacatecas',
];

const CIUDADES_POR_ESTADO = {
  'Jalisco':    ['Guadalajara','Zapopan','Tlaquepaque','Tonalá','Tlajomulco de Zúñiga','El Salto','Puerto Vallarta','Lagos de Moreno','Tepatitlán','Zapotlanejo','Otra'],
  'CDMX':     ['Toluca','Ecatepec','Naucalpan','Tlalnepantla','Nezahualcóyotl','Otra'],
  'Nuevo León': ['Monterrey','Guadalupe','San Nicolás de los Garza','Apodaca','Otra'],
};

const getCiudades = (state) => CIUDADES_POR_ESTADO[state] || ['Otra'];

// ─── Selector de catálogo ─────────────────────────────────────────────────────
const CatalogSelector = ({ type, categories, selectedIds, onToggle, search, setSearch }) => {
  const filtered = categories.filter(cat =>
    cat.items?.some(item => item.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar ${type === 'product' ? 'productos' : 'servicios'}...`}
          className="w-full py-2 pr-4 text-sm border-2 border-gray-200 pl-9 rounded-xl focus:outline-none focus:border-primary-400" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute text-xs text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600">✕</button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="py-4 text-sm italic text-center text-gray-400">
          {search ? `Sin resultados para "${search}"` : 'Sin ítems disponibles'}
        </p>
      ) : (
        filtered.map(cat => {
          const catItems = cat.items?.filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase())
          ) || [];
          if (catItems.length === 0) return null;
          const selectedCount = catItems.filter(i => selectedIds.includes(i.id)).length;
          return (
            <CategoryGroup key={cat.id} category={cat} items={catItems}
              selectedIds={selectedIds} onToggle={onToggle} selectedCount={selectedCount} />
          );
        })
      )}
    </div>
  );
};

const CategoryGroup = ({ category, items, selectedIds, onToggle, selectedCount }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="overflow-hidden border-2 border-gray-200 rounded-xl">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">{category.name}</span>
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
          {items.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <label key={item.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.id)}
                  className="w-4 h-4 border-gray-300 rounded text-primary-600 focus:ring-primary-500" />
                <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary-800' : 'text-gray-700'}`}>
                  {item.name}
                </span>
                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 ml-auto" />}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const ProviderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    provider_type_id:     '',
    business_name:        '',
    rfc:                  '',
    legal_representative: '',
    street:               '',
    exterior_number:      '',
    interior_number:      '',
    neighborhood:         '',
    city:                 '',
    state:                '',
    postal_code:          '',
    phone:                '',
    email:                '',
    bank:                 '',
    bank_branch:          '',
    account_number:       '',
    clabe:                '',
    credit_amount:        '',
    credit_days:          '',
    status:               'pending',
    observations:         '',
  });

  // ✅ Ciudad personalizada (cuando el estado no tiene la ciudad en la lista)
  const [customCity, setCustomCity] = useState('');

  const [contacts,       setContacts]       = useState([]);
  const [errors,         setErrors]         = useState({});

  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [catalogTab,    setCatalogTab]    = useState('products');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchService, setSearchService] = useState('');
  const [catalogReady,  setCatalogReady]  = useState(false);

  const { data: typesData } = useQuery({
    queryKey: ['provider-types'],
    queryFn: providerTypeService.getAll,
  });

  const { data: catalogData } = useQuery({
    queryKey: ['catalog-for-form'],
    queryFn: async () => { const r = await api.get('/catalog'); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  const { data: providerProductsData } = useQuery({
    queryKey: ['provider-products-services-form', id],
    queryFn: async () => { const r = await api.get(`/providers/${id}/products-services`); return r.data; },
    enabled: isEditing,
  });

  const { data: providerData, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providerService.getById(id),
    enabled: isEditing,
  });

  useEffect(() => {
    if (providerData?.provider) {
      const p = providerData.provider;
      setFormData({
        provider_type_id:     p.provider_type_id     || '',
        business_name:        p.business_name        || '',
        rfc:                  p.rfc                  || '',
        legal_representative: p.legal_representative || '',
        street:               p.street               || '',
        exterior_number:      p.exterior_number      || '',
        interior_number:      p.interior_number      || '',
        neighborhood:         p.neighborhood         || '',
        city:                 p.city                 || '',
        state:                p.state                || '',
        postal_code:          p.postal_code          || '',
        phone:                p.phone                || '',
        email:                p.email                || '',
        bank:                 p.bank                 || '',
        bank_branch:          p.bank_branch          || '',
        account_number:       p.account_number       || '',
        clabe:                p.clabe                || '',
        credit_amount:        p.credit_amount        || '',
        credit_days:          p.credit_days          || '',
        status:               p.status               || 'pending',
        observations:         p.observations         || '',
      });
      setContacts(p.contacts || []);
    }
  }, [providerData]);

  useEffect(() => {
    if (providerProductsData && !catalogReady) {
      setSelectedProductIds((providerProductsData.products || []).map(i => i.id));
      setSelectedServiceIds((providerProductsData.services || []).map(i => i.id));
      setCatalogReady(true);
    }
  }, [providerProductsData, catalogReady]);

  const productCategories = catalogData?.products || [];
  const serviceCategories = catalogData?.services || [];
  const totalSelected     = selectedProductIds.length + selectedServiceIds.length;

  const toggleProduct = (itemId) =>
    setSelectedProductIds(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
  const toggleService = (itemId) =>
    setSelectedServiceIds(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);

  // ✅ Detectar si la ciudad guardada no está en la lista del estado
  const ciudadEsPersonalizada = useMemo(() => {
    const ciudades = getCiudades(formData.state);
    return formData.city && !ciudades.includes(formData.city);
  }, [formData.state, formData.city]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // ✅ Al cambiar estado, limpiar ciudad
    if (name === 'state') {
      setFormData(prev => ({ ...prev, state: value, city: '' }));
      setCustomCity('');
      return;
    }
    // ✅ Al seleccionar "Otra" en ciudad, limpiar para mostrar input
    if (name === 'city' && value === 'Otra') {
      setFormData(prev => ({ ...prev, city: '' }));
      setCustomCity('');
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleCustomCityChange = (e) => {
    setCustomCity(e.target.value);
    setFormData(prev => ({ ...prev, city: e.target.value }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const providerRes = isEditing
        ? await providerService.update(id, data)
        : await providerService.create(data);
      const providerId = isEditing ? id : (providerRes?.provider?.id || providerRes?.id);
      if (providerId) {
        await api.put(`/providers/${providerId}/products-services-sync`, {
          product_ids: selectedProductIds,
          service_ids: selectedServiceIds,
        }).catch(() => {});
      }
      return providerRes;
    },
    onSuccess: () => {
      showToast.success(isEditing ? '✅ Proveedor actualizado correctamente' : '🎉 Proveedor creado exitosamente');
      navigate('/providers');
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        showToast.error('Por favor corrige los errores en el formulario');
      } else {
        showToast.error(error.response?.data?.message || 'Error al guardar proveedor');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...formData, contacts });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
    </div>
  );

  const selectClass = "w-full px-4 py-3 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm";
  const disabledClass = "w-full px-4 py-3 text-gray-500 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/providers')} className="mb-4">
          Volver a Proveedores
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-gradient-primary">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h1>
            <p className="mt-1 text-sm text-gray-600">{isEditing ? 'Actualiza la información del proveedor' : 'Completa el formulario para registrar un nuevo proveedor'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Información General */}
        <Card title={<div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-600" /><span>Información General</span></div>} variant="elevated">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Tipo de Proveedor *" name="provider_type_id" value={formData.provider_type_id} onChange={handleChange}
              options={[{ value:'', label:'Selecciona un tipo...' }, ...(typesData?.provider_types?.map(t => ({ value:t.id, label:t.name })) || [])]}
              error={errors.provider_type_id?.[0]} required />
            <Input label="Razón Social *"      name="business_name"        value={formData.business_name}        onChange={handleChange} error={errors.business_name?.[0]}        required />
            <Input label="RFC *"               name="rfc"                  value={formData.rfc}                  onChange={handleChange} error={errors.rfc?.[0]}                  maxLength={13} required helperText="12 o 13 caracteres" />
            <Input label="Representante Legal" name="legal_representative" value={formData.legal_representative} onChange={handleChange} error={errors.legal_representative?.[0]} />
          </div>
        </Card>

        {/* ✅ Dirección con selects de estado y ciudad */}
        <Card title={<div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary-600" /><span>Dirección</span></div>} variant="elevated">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Calle"         name="street"          value={formData.street}          onChange={handleChange} error={errors.street?.[0]} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="No. Exterior" name="exterior_number" value={formData.exterior_number} onChange={handleChange} error={errors.exterior_number?.[0]} />
              <Input label="No. Interior" name="interior_number" value={formData.interior_number} onChange={handleChange} error={errors.interior_number?.[0]} />
            </div>
            <Input label="Colonia"       name="neighborhood"    value={formData.neighborhood}    onChange={handleChange} error={errors.neighborhood?.[0]} />
            <Input label="Código Postal" name="postal_code"     value={formData.postal_code}     onChange={handleChange} error={errors.postal_code?.[0]} maxLength={10} helperText="5 dígitos" />

            {/* ✅ Select de Estado */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Estado
              </label>
              <select name="state" value={formData.state} onChange={handleChange} className={selectClass}>
                <option value="">Selecciona un estado</option>
                {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              {errors.state?.[0] && <p className="mt-1 text-xs text-red-600">{errors.state[0]}</p>}
            </div>

            {/* ✅ Select de Ciudad */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Ciudad
              </label>
              <div className="space-y-2">
                <select
                  name="city"
                  value={ciudadEsPersonalizada ? 'Otra' : formData.city}
                  onChange={handleChange}
                  className={selectClass}
                  disabled={!formData.state}>
                  <option value="">{formData.state ? 'Selecciona una ciudad' : 'Primero selecciona un estado'}</option>
                  {getCiudades(formData.state).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {/* Input para ciudad personalizada */}
                {((formData.city === '' && formData.state && getCiudades(formData.state).includes('Otra')) || ciudadEsPersonalizada) && (
                  <input
                    type="text"
                    value={ciudadEsPersonalizada ? formData.city : customCity}
                    onChange={handleCustomCityChange}
                    placeholder="Escribe la ciudad"
                    className={selectClass}
                  />
                )}
              </div>
              {errors.city?.[0] && <p className="mt-1 text-xs text-red-600">{errors.city[0]}</p>}
            </div>
          </div>
        </Card>

        {/* Contacto */}
        <Card title={<div className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary-600" /><span>Información de Contacto</span></div>} variant="elevated">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Teléfono"           name="phone" value={formData.phone} onChange={handleChange} error={errors.phone?.[0]} placeholder="33 1234 5678" />
            <Input label="Correo Electrónico" type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email?.[0]} placeholder="correo@empresa.com" />
          </div>
        </Card>

        {/* Bancaria */}
        <Card title={<div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary-600" /><span>Información Bancaria</span></div>} variant="elevated">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Banco"            name="bank"           value={formData.bank}           onChange={handleChange} error={errors.bank?.[0]} />
            <Input label="Sucursal"         name="bank_branch"    value={formData.bank_branch}    onChange={handleChange} error={errors.bank_branch?.[0]} />
            <Input label="Número de Cuenta" name="account_number" value={formData.account_number} onChange={handleChange} error={errors.account_number?.[0]} />
            <Input label="CLABE"            name="clabe"          value={formData.clabe}          onChange={handleChange} error={errors.clabe?.[0]} maxLength={18} helperText="18 dígitos" />
          </div>
        </Card>

        {/* Crédito */}
        <Card title={<div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary-600" /><span>Información Crediticia</span></div>} variant="elevated">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Monto de Crédito" type="number" name="credit_amount" value={formData.credit_amount} onChange={handleChange} error={errors.credit_amount?.[0]} step="0.01" placeholder="0.00" />
            <Input label="Días de Crédito"  type="number" name="credit_days"   value={formData.credit_days}   onChange={handleChange} error={errors.credit_days?.[0]}   placeholder="30" />
          </div>
        </Card>

        {/* Productos y Servicios */}
        <Card title={<div className="flex items-center gap-2"><Package className="w-5 h-5 text-primary-600" /><span>Productos y Servicios</span></div>} variant="elevated">
          <div className="space-y-4">
            {totalSelected > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-primary-50 border-primary-200">
                <CheckCircle className="w-4 h-4 text-primary-600" />
                <p className="text-sm font-semibold text-primary-700">
                  {selectedProductIds.length} producto{selectedProductIds.length !== 1 ? 's' : ''} y {selectedServiceIds.length} servicio{selectedServiceIds.length !== 1 ? 's' : ''} seleccionado{totalSelected !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              {[['products','Productos',Package],['services','Servicios',Wrench]].map(([val,label,Icon]) => (
                <button key={val} type="button" onClick={() => setCatalogTab(val)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    catalogTab === val ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                  {(val === 'products' ? selectedProductIds.length : selectedServiceIds.length) > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${catalogTab === val ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                      {val === 'products' ? selectedProductIds.length : selectedServiceIds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {catalogTab === 'products' ? (
              <CatalogSelector type="product" categories={productCategories} selectedIds={selectedProductIds} onToggle={toggleProduct} search={searchProduct} setSearch={setSearchProduct} />
            ) : (
              <CatalogSelector type="service" categories={serviceCategories} selectedIds={selectedServiceIds} onToggle={toggleService} search={searchService} setSearch={setSearchService} />
            )}
          </div>
        </Card>

        {/* Contactos */}
        <ContactsSection contacts={contacts} setContacts={setContacts} />

        {/* Observaciones y Estado */}
        <Card title={<div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-primary-600" /><span>Observaciones y Estado</span></div>} variant="elevated">
          <div className="space-y-4">
            <Select label="Estado" name="status" value={formData.status} onChange={handleChange}
              options={[
                { value:'pending',  label:'Pendiente'  },
                { value:'active',   label:'Activo'     },
                { value:'inactive', label:'Inactivo'   },
                { value:'rejected', label:'Rechazado'  },
              ]} />
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Observaciones</label>
              <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3}
                className="w-full px-4 py-3 transition-all border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Notas u observaciones adicionales..." />
            </div>
          </div>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
          <Button type="button" variant="ghost" onClick={() => navigate('/providers')} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} loading={mutation.isPending}>
            {isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ─── Sección de contactos ─────────────────────────────────────────────────────
const ContactsSection = ({ contacts, setContacts }) => {
  const addContact    = () => setContacts([...contacts, { type:'sales', name:'', phone:'', email:'' }]);
  const removeContact = (index, name) => toast((t) => (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-gray-900">¿Eliminar el contacto{name ? ` "${name}"` : ''}?</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
        <Button variant="danger" size="sm" onClick={() => { setContacts(contacts.filter((_,i) => i !== index)); toast.dismiss(t.id); }}>Eliminar</Button>
      </div>
    </div>
  ), { duration: Infinity, position: 'top-center', style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' } });

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  return (
    <Card title={<div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary-600" /><span>Contactos</span></div>} variant="elevated">
      <div className="space-y-4">
        {contacts.length === 0 && (
          <div className="py-8 text-center border-2 border-gray-300 border-dashed rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-primary-50"><Users className="w-6 h-6 text-primary-500" /></div>
            <p className="text-sm text-gray-600">No hay contactos agregados</p>
          </div>
        )}
        {contacts.map((contact, index) => (
          <div key={index} className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">Contacto {index + 1}</h4>
              <button type="button" onClick={() => removeContact(index, contact.name)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select label="Tipo" value={contact.type} onChange={e => updateContact(index,'type',e.target.value)}
                options={[{value:'sales',label:'Ventas'},{value:'billing',label:'Cobranza'},{value:'quality',label:'Calidad'}]} />
              <Input label="Nombre"   value={contact.name}  onChange={e => updateContact(index,'name', e.target.value)} placeholder="Nombre completo" />
              <Input label="Teléfono" value={contact.phone} onChange={e => updateContact(index,'phone',e.target.value)} placeholder="33 1234 5678" />
              <Input label="Email" type="email" value={contact.email} onChange={e => updateContact(index,'email',e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={addContact}>
          Agregar Contacto
        </Button>
      </div>
    </Card>
  );
};
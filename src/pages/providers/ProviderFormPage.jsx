import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { providerService } from '../../api/providerService';
import { providerTypeService } from '../../api/providerTypeService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { showToast } from '../../utils/toast';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone, 
  CreditCard, 
  FileText,
  Users,
  AlertCircle
} from 'lucide-react';

export const ProviderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    provider_type_id: '',
    business_name: '',
    rfc: '',
    legal_representative: '',
    street: '',
    exterior_number: '',
    interior_number: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    bank: '',
    bank_branch: '',
    account_number: '',
    clabe: '',
    credit_amount: '',
    credit_days: '',
    products: '',
    services: '',
    status: 'pending',
    observations: '',
  });

  const [contacts, setContacts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [errors, setErrors] = useState({});

  // Obtener tipos de proveedores
  const { data: typesData } = useQuery({
    queryKey: ['provider-types'],
    queryFn: providerTypeService.getAll,
  });

  // Obtener datos del proveedor si estamos editando
  const { data: providerData, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providerService.getById(id),
    enabled: isEditing,
  });

  // useEffect para cargar los datos cuando lleguen
  useEffect(() => {
    if (providerData?.provider) {
      const provider = providerData.provider;
      
      setFormData({
        provider_type_id: provider.provider_type_id || '',
        business_name: provider.business_name || '',
        rfc: provider.rfc || '',
        legal_representative: provider.legal_representative || '',
        street: provider.street || '',
        exterior_number: provider.exterior_number || '',
        interior_number: provider.interior_number || '',
        neighborhood: provider.neighborhood || '',
        city: provider.city || '',
        state: provider.state || '',
        postal_code: provider.postal_code || '',
        phone: provider.phone || '',
        email: provider.email || '',
        bank: provider.bank || '',
        bank_branch: provider.bank_branch || '',
        account_number: provider.account_number || '',
        clabe: provider.clabe || '',
        credit_amount: provider.credit_amount || '',
        credit_days: provider.credit_days || '',
        products: provider.products || '',
        services: provider.services || '',
        status: provider.status || 'pending',
        observations: provider.observations || '',
      });
      
      setContacts(provider.contacts || []);
      setVehicles(provider.vehicles || []);
      setPersonnel(provider.personnel || []);
      setCertifications(provider.certifications || []);
    }
  }, [providerData]);

  // Mutación para crear/editar
  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return providerService.update(id, data);
      }
      return providerService.create(data);
    },
    onSuccess: () => {
      showToast.success(
        isEditing 
          ? '✅ Proveedor actualizado correctamente' 
          : '🎉 Proveedor creado exitosamente'
      );
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      contacts,
      vehicles,
      personnel,
      certifications,
    };

    mutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/providers')}
          className="mb-4"
        >
          Volver a Proveedores
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-primary shadow-md">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isEditing ? 'Actualiza la información del proveedor' : 'Completa el formulario para registrar un nuevo proveedor'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              <span>Información General</span>
            </div>
          }
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Tipo de Proveedor *"
              name="provider_type_id"
              value={formData.provider_type_id}
              onChange={handleChange}
              options={[
                { value: '', label: 'Selecciona un tipo...' },
                ...(typesData?.provider_types?.map(type => ({
                  value: type.id,
                  label: type.name,
                })) || [])
              ]}
              error={errors.provider_type_id?.[0]}
              required
            />

            <Input
              label="Razón Social *"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              error={errors.business_name?.[0]}
              required
            />

            <Input
              label="RFC *"
              name="rfc"
              value={formData.rfc}
              onChange={handleChange}
              error={errors.rfc?.[0]}
              maxLength={13}
              required
              helperText="12 o 13 caracteres"
            />

            <Input
              label="Representante Legal"
              name="legal_representative"
              value={formData.legal_representative}
              onChange={handleChange}
              error={errors.legal_representative?.[0]}
            />
          </div>
        </Card>

        {/* Dirección */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              <span>Dirección</span>
            </div>
          }
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Calle"
              name="street"
              value={formData.street}
              onChange={handleChange}
              error={errors.street?.[0]}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="No. Exterior"
                name="exterior_number"
                value={formData.exterior_number}
                onChange={handleChange}
                error={errors.exterior_number?.[0]}
              />

              <Input
                label="No. Interior"
                name="interior_number"
                value={formData.interior_number}
                onChange={handleChange}
                error={errors.interior_number?.[0]}
              />
            </div>

            <Input
              label="Colonia"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              error={errors.neighborhood?.[0]}
            />

            <Input
              label="Ciudad"
              name="city"
              value={formData.city}
              onChange={handleChange}
              error={errors.city?.[0]}
            />

            <Input
              label="Estado"
              name="state"
              value={formData.state}
              onChange={handleChange}
              error={errors.state?.[0]}
            />

            <Input
              label="Código Postal"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              error={errors.postal_code?.[0]}
              maxLength={10}
              helperText="5 dígitos"
            />
          </div>
        </Card>

        {/* Contacto */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-600" />
              <span>Información de Contacto</span>
            </div>
          }
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Teléfono"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone?.[0]}
              placeholder="33 1234 5678"
            />

            <Input
              label="Correo Electrónico"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email?.[0]}
              placeholder="correo@empresa.com"
            />
          </div>
        </Card>

        {/* Información Bancaria */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              <span>Información Bancaria</span>
            </div>
          }
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Banco"
              name="bank"
              value={formData.bank}
              onChange={handleChange}
              error={errors.bank?.[0]}
            />

            <Input
              label="Sucursal"
              name="bank_branch"
              value={formData.bank_branch}
              onChange={handleChange}
              error={errors.bank_branch?.[0]}
            />

            <Input
              label="Número de Cuenta"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              error={errors.account_number?.[0]}
            />

            <Input
              label="CLABE"
              name="clabe"
              value={formData.clabe}
              onChange={handleChange}
              error={errors.clabe?.[0]}
              maxLength={18}
              helperText="18 dígitos"
            />
          </div>
        </Card>

        {/* Información Crediticia */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <span>Información Crediticia</span>
            </div>
          }
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Monto de Crédito"
              type="number"
              name="credit_amount"
              value={formData.credit_amount}
              onChange={handleChange}
              error={errors.credit_amount?.[0]}
              step="0.01"
              placeholder="0.00"
            />

            <Input
              label="Días de Crédito"
              type="number"
              name="credit_days"
              value={formData.credit_days}
              onChange={handleChange}
              error={errors.credit_days?.[0]}
              placeholder="30"
            />
          </div>
        </Card>

        {/* Productos y Servicios */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <span>Productos y Servicios</span>
            </div>
          }
          variant="elevated"
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Productos
              </label>
              <textarea
                name="products"
                value={formData.products}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Descripción de productos que ofrece..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Servicios
              </label>
              <textarea
                name="services"
                value={formData.services}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Descripción de servicios que ofrece..."
              />
            </div>
          </div>
        </Card>

        {/* Contactos */}
        <ContactsSection contacts={contacts} setContacts={setContacts} />

        {/* Observaciones y Estado */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-600" />
              <span>Observaciones y Estado</span>
            </div>
          }
          variant="elevated"
        >
          <div className="space-y-4">
            <Select
              label="Estado"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'pending', label: 'Pendiente' },
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' },
                { value: 'rejected', label: 'Rechazado' },
              ]}
            />

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Observaciones
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Notas u observaciones adicionales..."
              />
            </div>
          </div>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/providers')}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            loading={mutation.isPending}
          >
            {isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Componente para la sección de contactos
const ContactsSection = ({ contacts, setContacts }) => {
  const addContact = () => {
    setContacts([...contacts, { type: 'sales', name: '', phone: '', email: '' }]);
  };

  const removeContact = (index, contactName) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">
          ¿Estás seguro de eliminar el contacto{contactName ? ` "${contactName}"` : ''}?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={() => {
            setContacts(contacts.filter((_, i) => i !== index));
            toast.dismiss(t.id);
          }}>
            Eliminar
          </Button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: { maxWidth: '450px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB' },
    });
  };

  const updateContact = (index, field, value) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  return (
    <Card 
      title={
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          <span>Contactos</span>
        </div>
      }
      variant="elevated"
    >
      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">Contacto {index + 1}</h4>
              <button
                type="button"
                onClick={() => removeContact(index, contact.name)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Tipo"
                value={contact.type}
                onChange={(e) => updateContact(index, 'type', e.target.value)}
                options={[
                  { value: 'sales', label: 'Ventas' },
                  { value: 'billing', label: 'Cobranza' },
                  { value: 'quality', label: 'Calidad' },
                ]}
              />
              <Input
                label="Nombre"
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
                placeholder="Nombre completo"
              />
              <Input
                label="Teléfono"
                value={contact.phone}
                onChange={(e) => updateContact(index, 'phone', e.target.value)}
                placeholder="33 1234 5678"
              />
              <Input
                label="Email"
                type="email"
                value={contact.email}
                onChange={(e) => updateContact(index, 'email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
        ))}
        
        {contacts.length === 0 && (
          <div className="text-center py-8 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 mb-3">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-sm text-gray-600">No hay contactos agregados</p>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={addContact}
        >
          Agregar Contacto
        </Button>
      </div>
    </Card>
  );
};
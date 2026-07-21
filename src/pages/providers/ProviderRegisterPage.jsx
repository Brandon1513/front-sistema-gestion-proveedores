import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/axios';
import { Building2, FileText, CheckCircle, AlertCircle, Loader2, MapPin, Phone, CreditCard, User } from 'lucide-react';

const MEXICAN_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México',
  'Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit',
  'Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
  'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas',
];

const STEPS = [
  { id: 1, label: 'Información General' },
  { id: 2, label: 'Dirección'           },
  { id: 3, label: 'Datos Bancarios'     },
];

export const ProviderRegisterPage = () => {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [step,     setStep]     = useState(1);
  const [errors,   setErrors]   = useState({});
  const [formData, setFormData] = useState({
    business_name:        '',
    rfc:                  '',
    tipo_persona:         '',
    legal_representative: '',
    phone:                '',
    email:                '',
    street:               '',
    exterior_number:      '',
    interior_number:      '',
    neighborhood:         '',
    city:                 '',
    state:                '',
    postal_code:          '',
    bank:                 '',
    bank_branch:          '',
    account_number:       '',
    clabe:                '',
    credit_amount:        '',
    credit_days:          '',
    observations:         '',
    password:             '',
    password_confirmation:'',
  });

  // ── Cargar invitación ─────────────────────────────────────────────────────
  const { data: invitationData, isLoading: loadingInvitation, error: invitationError } = useQuery({
    queryKey: ['invitation', token],
    queryFn:  () => api.get(`/invitations/${token}`).then(r => r.data),
    enabled:  !!token,
    retry: false,
  });

  // Pre-rellenar email desde la invitación
  useEffect(() => {
    if (invitationData?.invitation?.email) {
      setFormData(f => ({ ...f, email: invitationData.invitation.email }));
    }
  }, [invitationData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Auto-detectar tipo_persona al escribir RFC
    if (name === 'rfc') {
      const rfcUpper    = value.toUpperCase();
      const tipoPersona = rfcUpper.length === 13 ? 'fisica' : 'moral';
      setFormData(f => ({ ...f, rfc: rfcUpper, tipo_persona: tipoPersona }));
      if (errors.rfc) setErrors(p => ({ ...p, rfc: null }));
      return;
    }

    setFormData(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  // ── Mutación de registro ──────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => api.post(`/invitations/${token}/register`, data).then(r => r.data),
    onSuccess: () => navigate('/register/success'),
    onError: (err) => {
      const apiErrors = err.response?.data?.errors || {};
      setErrors(apiErrors);
      // Si hay errores del step 1, volver al step 1
      const step1Fields = ['business_name','rfc','tipo_persona','legal_representative','phone','email','password'];
      const step2Fields = ['street','exterior_number','interior_number','neighborhood','city','state','postal_code'];
      if (step1Fields.some(f => apiErrors[f])) setStep(1);
      else if (step2Fields.some(f => apiErrors[f])) setStep(2);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Asegurar tipo_persona antes de enviar
    const dataToSend = {
      ...formData,
      tipo_persona: formData.tipo_persona || (formData.rfc.length === 13 ? 'fisica' : 'moral'),
    };
    mutation.mutate(dataToSend);
  };

  const nextStep = () => {
    // Validación básica del step actual antes de avanzar
    const newErrors = {};
    if (step === 1) {
      if (!formData.business_name.trim()) newErrors.business_name = ['La razón social es obligatoria'];
      if (!formData.rfc.trim())           newErrors.rfc           = ['El RFC es obligatorio'];
      if (formData.rfc.length < 12)       newErrors.rfc           = ['El RFC debe tener al menos 12 caracteres'];
      if (!formData.phone.trim())         newErrors.phone         = ['El teléfono es obligatorio'];
      if (!formData.email.trim())         newErrors.email         = ['El correo es obligatorio'];
      if (!formData.password)             newErrors.password      = ['La contraseña es obligatoria'];
      if (formData.password && formData.password.length < 8) newErrors.password = ['Mínimo 8 caracteres'];
      if (formData.password !== formData.password_confirmation) newErrors.password_confirmation = ['Las contraseñas no coinciden'];
    }
    if (step === 2) {
      if (!formData.street.trim())          newErrors.street          = ['La calle es obligatoria'];
      if (!formData.exterior_number.trim()) newErrors.exterior_number = ['El número exterior es obligatorio'];
      if (!formData.neighborhood.trim())    newErrors.neighborhood    = ['La colonia es obligatoria'];
      if (!formData.city.trim())            newErrors.city            = ['La ciudad es obligatoria'];
      if (!formData.state.trim())           newErrors.state           = ['El estado es obligatorio'];
      if (!formData.postal_code.trim())     newErrors.postal_code     = ['El código postal es obligatorio'];
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
    }`;

  const selectClass = (field) =>
    `w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white transition-colors ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
    }`;

  const FieldError = ({ field }) => errors[field]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-600"><AlertCircle className="w-3 h-3"/>{errors[field][0]}</p>
    : null;

  // ── Estados de carga / error ──────────────────────────────────────────────
  if (loadingInvitation) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="space-y-3 text-center">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary-600"/>
        <p className="text-gray-600">Verificando invitación...</p>
      </div>
    </div>
  );

  if (invitationError) return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-4 text-center bg-white shadow-lg rounded-2xl">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600"/>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Invitación no válida</h2>
        <p className="text-sm text-gray-600">
          Este enlace de invitación no es válido o ha expirado. Contacta al equipo de compras para recibir una nueva invitación.
        </p>
      </div>
    </div>
  );

  const invitation     = invitationData?.invitation;
  const providerType   = invitationData?.provider_type;

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-pink-50">
      <div className="max-w-2xl px-4 py-10 mx-auto">

        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg bg-gradient-primary rounded-2xl">
            <Building2 className="w-8 h-8 text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Proveedor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Completa tu información para unirte como proveedor de <strong>DASAVENA</strong>
          </p>
          {providerType && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-xs font-semibold text-primary-700">
              <FileText className="w-3.5 h-3.5"/>Tipo: {providerType.name}
            </span>
          )}
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                step === s.id   ? 'bg-primary-600 text-white shadow-md' :
                step >  s.id   ? 'bg-green-100 text-green-700'         :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > s.id
                  ? <CheckCircle className="w-4 h-4"/>
                  : <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-white/20">{s.id}</span>
                }
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${step > s.id ? 'bg-green-300' : 'bg-gray-200'}`}/>}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">

            {/* ── STEP 1: Información General ── */}
            {step === 1 && (
              <div className="p-6 space-y-5">
                <h2 className="flex items-center gap-2 pb-3 text-base font-bold text-gray-900 border-b border-gray-100">
                  <User className="w-5 h-5 text-primary-500"/>Información General
                </h2>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Razón Social *</label>
                  <input name="business_name" value={formData.business_name} onChange={handleChange}
                    placeholder="Nombre de tu empresa o negocio" className={inputClass('business_name')}/>
                  <FieldError field="business_name"/>
                </div>

                {/* RFC + tipo persona */}
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">RFC *</label>
                  <input name="rfc" value={formData.rfc} onChange={handleChange}
                    placeholder="Ej. ABC850101XYZ" maxLength={13}
                    className={`${inputClass('rfc')} font-mono uppercase`}/>
                  <p className="mt-1 text-xs text-gray-400">12 caracteres = Persona Moral · 13 caracteres = Persona Física</p>

                  {/* Badge detección automática */}
                  {formData.rfc.length >= 12 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        formData.tipo_persona === 'fisica'
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        {formData.tipo_persona === 'fisica' ? '👤 Persona Física' : '🏢 Persona Moral'}
                        <span className="ml-1 opacity-50">({formData.rfc.length} chars)</span>
                      </div>
                      {/* Selector manual */}
                      <select
                        value={formData.tipo_persona}
                        onChange={e => setFormData(f => ({ ...f, tipo_persona: e.target.value }))}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-primary-400 text-gray-600">
                        <option value="moral">Persona Moral</option>
                        <option value="fisica">Persona Física</option>
                      </select>
                    </div>
                  )}

                  {/* Aviso persona física */}
                  {formData.tipo_persona === 'fisica' && formData.rfc.length >= 12 && (
                    <div className="flex items-start gap-2 p-3 mt-2 border bg-amber-50 border-amber-200 rounded-xl">
                      <span className="flex-shrink-0 text-sm text-amber-500">⚠️</span>
                      <p className="text-xs text-amber-700">
                        Al ser Persona Física, algunos documentos como el <strong>Acta Constitutiva</strong>{' '}
                        pueden no aplicar según el tipo de proveedor.
                      </p>
                    </div>
                  )}
                  <FieldError field="rfc"/>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Representante Legal</label>
                  <input name="legal_representative" value={formData.legal_representative} onChange={handleChange}
                    placeholder="Nombre completo del representante legal"
                    className={inputClass('legal_representative')}/>
                  <FieldError field="legal_representative"/>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Teléfono *</label>
                    <input name="phone" value={formData.phone} onChange={handleChange}
                      placeholder="33 1234 5678" className={inputClass('phone')}/>
                    <FieldError field="phone"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Correo Electrónico *</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange}
                      placeholder="correo@empresa.com" className={inputClass('email')}
                      readOnly={!!invitation?.email}/>
                    <FieldError field="email"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Contraseña *</label>
                    <input name="password" type="password" value={formData.password} onChange={handleChange}
                      placeholder="Mínimo 8 caracteres" className={inputClass('password')}/>
                    <FieldError field="password"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Confirmar Contraseña *</label>
                    <input name="password_confirmation" type="password" value={formData.password_confirmation} onChange={handleChange}
                      placeholder="Repite tu contraseña" className={inputClass('password_confirmation')}/>
                    <FieldError field="password_confirmation"/>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Dirección ── */}
            {step === 2 && (
              <div className="p-6 space-y-5">
                <h2 className="flex items-center gap-2 pb-3 text-base font-bold text-gray-900 border-b border-gray-100">
                  <MapPin className="w-5 h-5 text-primary-500"/>Dirección
                </h2>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Calle *</label>
                  <input name="street" value={formData.street} onChange={handleChange}
                    placeholder="Nombre de la calle" className={inputClass('street')}/>
                  <FieldError field="street"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">No. Exterior *</label>
                    <input name="exterior_number" value={formData.exterior_number} onChange={handleChange}
                      placeholder="123" className={inputClass('exterior_number')}/>
                    <FieldError field="exterior_number"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">No. Interior</label>
                    <input name="interior_number" value={formData.interior_number} onChange={handleChange}
                      placeholder="A, B, 2..." className={inputClass('interior_number')}/>
                    <FieldError field="interior_number"/>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Colonia *</label>
                  <input name="neighborhood" value={formData.neighborhood} onChange={handleChange}
                    placeholder="Nombre de la colonia" className={inputClass('neighborhood')}/>
                  <FieldError field="neighborhood"/>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Estado *</label>
                    <select name="state" value={formData.state} onChange={handleChange} className={selectClass('state')}>
                      <option value="">Selecciona un estado...</option>
                      {MEXICAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <FieldError field="state"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Ciudad *</label>
                    <input name="city" value={formData.city} onChange={handleChange}
                      placeholder="Ciudad o municipio" className={inputClass('city')}/>
                    <FieldError field="city"/>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Código Postal *</label>
                  <input name="postal_code" value={formData.postal_code} onChange={handleChange}
                    placeholder="44100" maxLength={10} className={inputClass('postal_code')}/>
                  <FieldError field="postal_code"/>
                </div>
              </div>
            )}

            {/* ── STEP 3: Datos Bancarios ── */}
            {step === 3 && (
              <div className="p-6 space-y-5">
                <h2 className="flex items-center gap-2 pb-3 text-base font-bold text-gray-900 border-b border-gray-100">
                  <CreditCard className="w-5 h-5 text-primary-500"/>Datos Bancarios
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Banco</label>
                    <input name="bank" value={formData.bank} onChange={handleChange}
                      placeholder="Nombre del banco" className={inputClass('bank')}/>
                    <FieldError field="bank"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">Sucursal</label>
                    <input name="bank_branch" value={formData.bank_branch} onChange={handleChange}
                      placeholder="Sucursal" className={inputClass('bank_branch')}/>
                    <FieldError field="bank_branch"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">No. de Cuenta</label>
                    <input name="account_number" value={formData.account_number} onChange={handleChange}
                      placeholder="Número de cuenta" className={`${inputClass('account_number')} font-mono`}/>
                    <FieldError field="account_number"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-700">CLABE</label>
                    <input name="clabe" value={formData.clabe} onChange={handleChange}
                      placeholder="18 dígitos" maxLength={18} className={`${inputClass('clabe')} font-mono`}/>
                    <FieldError field="clabe"/>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Observaciones</label>
                  <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3}
                    placeholder="Información adicional que quieras compartir..."
                    className={`${inputClass('observations')} resize-none`}/>
                  <FieldError field="observations"/>
                </div>

                {/* Error general */}
                {mutation.isError && !Object.keys(errors).length && (
                  <div className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-sm text-red-700">
                      {mutation.error?.response?.data?.message || 'Error al registrar. Intenta de nuevo.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navegación */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 1}
                className="px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed">
                ← Anterior
              </button>

              {step < STEPS.length ? (
                <button type="button" onClick={nextStep}
                  className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
                  Siguiente →
                </button>
              ) : (
                <button type="submit" disabled={mutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60">
                  {mutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Registrando...</>
                    : <><CheckCircle className="w-4 h-4"/>Completar registro</>
                  }
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="mt-6 text-xs text-center text-gray-400">
          ¿Tienes problemas? Contacta a compras en <span className="text-primary-600">compras@dasavena.com</span>
        </p>
      </div>
    </div>
  );
};
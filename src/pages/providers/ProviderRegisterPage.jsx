import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '../../api/authService';
import { invitationService } from '../../api/invitationService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Building2, Mail, Lock, CheckCircle,
  AlertCircle, User, FileText
} from 'lucide-react';

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/;

const schema = yup.object({
  name:                  yup.string().required('El nombre es requerido'),
  business_name:         yup.string().required('La razón social es requerida'),
  rfc: yup.string()
    .required('El RFC es requerido')
    .min(12, 'El RFC debe tener 12 o 13 caracteres')
    .max(13, 'El RFC debe tener 12 o 13 caracteres')
    .matches(RFC_REGEX, 'RFC inválido. Formato: AAAA000000AA0 (persona física) o AAA000000AA0 (persona moral)'),
  password: yup.string()
    .required('La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  password_confirmation: yup.string()
    .required('Confirme su contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
}).required();

export const ProviderRegisterPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [tokenValid, setTokenValid]         = useState(false);
  const [tokenError, setTokenError]         = useState('');
  const [invitationData, setInvitationData] = useState(null);

  // ✅ Sin onSuccess/onError — eliminados en TanStack Query v5
  const {
    data:      verifyData,
    isLoading: verifyingToken,
    isError:   verifyIsError,
    error:     verifyErrorObj,
  } = useQuery({
    queryKey: ['verify-invitation', token],
    queryFn:  () => invitationService.verify(token),
    enabled:  !!token,
    retry:    false,
  });

  // ✅ Verificación del token en useEffect
  useEffect(() => {
    if (!verifyData) return;
    if (verifyData.valid) {
      setTokenValid(true);
      setInvitationData(verifyData.invitation);
    } else {
      setTokenError(verifyData.message || 'Token inválido');
      setTokenValid(false);
    }
  }, [verifyData]);

  useEffect(() => {
    if (verifyIsError) {
      setTokenError(verifyErrorObj?.response?.data?.message || 'Token inválido o expirado');
      setTokenValid(false);
    }
  }, [verifyIsError, verifyErrorObj]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data) => authService.registerProvider({ ...data, token }),
    onSuccess: (response) => {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/provider/dashboard');
    },
  });

  const onSubmit = (data) => {
    mutation.mutate({ ...data, rfc: data.rfc.toUpperCase() });
  };

  // ─── Token faltante ───────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Token Requerido</h2>
          <p className="mb-6 text-gray-600">Necesita un token de invitación válido para registrarse.</p>
          <Button onClick={() => navigate('/login')} className="w-full">Ir al Login</Button>
        </div>
      </div>
    );
  }

  // ─── Verificando token ────────────────────────────────────────────────────
  if (verifyingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-200 rounded-full animate-spin border-t-primary-600" />
          <p className="text-gray-600">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  // ─── Token inválido ───────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Invitación Inválida</h2>
          <p className="mb-6 text-gray-600">{tokenError}</p>
          <Button onClick={() => navigate('/login')} className="w-full" variant="secondary">Ir al Login</Button>
        </div>
      </div>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-12 bg-gradient-to-br from-primary-50 to-primary-100 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-white rounded-full shadow-lg">
            <Building2 className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Proveedor</h1>
          <p className="mt-2 text-gray-600">Complete la información para crear su cuenta en SGP</p>

          {invitationData && (
            <div className="p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-800">
                <Mail className="inline w-4 h-4 mr-1" />
                Invitado como: <strong>{invitationData.email}</strong>
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Tipo: <strong>{invitationData.provider_type?.name}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="p-8 bg-white shadow-xl rounded-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Información del usuario */}
            <div>
              <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <User className="w-5 h-5 mr-2 text-primary-600" />
                Información del Usuario
              </h3>
              <Input
                label="Nombre Completo"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Juan Pérez García"
                icon={User}
              />
            </div>

            {/* Información de la empresa */}
            <div className="pt-6 border-t">
              <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                Información de la Empresa
              </h3>
              <div className="space-y-4">
                <Input
                  label="Razón Social"
                  {...register('business_name')}
                  error={errors.business_name?.message}
                  placeholder="Nombre completo de la empresa"
                  icon={Building2}
                />
                <Input
                  label="RFC"
                  {...register('rfc', {
                    onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                  })}
                  error={errors.rfc?.message}
                  placeholder="DGO140717J82 o ABCD800101XY0"
                  maxLength={13}
                  style={{ textTransform: 'uppercase' }}
                  icon={FileText}
                  helperText="12 caracteres (persona moral) o 13 (persona física)"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="pt-6 border-t">
              <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <Lock className="w-5 h-5 mr-2 text-primary-600" />
                Crear Contraseña
              </h3>
              <div className="space-y-4">
                <Input
                  label="Contraseña"
                  type="password"
                  {...register('password')}
                  error={errors.password?.message}
                  placeholder="••••••••"
                  icon={Lock}
                />
                <Input
                  label="Confirmar Contraseña"
                  type="password"
                  {...register('password_confirmation')}
                  error={errors.password_confirmation?.message}
                  placeholder="••••••••"
                  icon={Lock}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">La contraseña debe tener al menos 8 caracteres</p>
            </div>

            {/* Error del servidor */}
            {mutation.isError && (
              <div className="flex items-start p-4 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error al registrar</p>
                  <p className="text-sm text-red-600">
                    {mutation.error?.response?.data?.message ||
                     mutation.error?.response?.data?.error ||
                     'Ocurrió un error inesperado'}
                  </p>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col gap-3 pt-6 border-t sm:flex-row-reverse">
              <Button type="submit" loading={mutation.isPending} className="flex-1 sm:flex-initial">
                <CheckCircle className="w-4 h-4 mr-2" />
                Crear Cuenta
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/login')}
                disabled={mutation.isPending} className="flex-1 sm:flex-initial">
                Cancelar
              </Button>
            </div>

            <p className="text-sm text-center text-gray-500">
              Al registrarte, aceptas nuestros{' '}
              <a href="#" className="text-primary-600 hover:text-primary-700">Términos de Servicio</a>
              {' '}y{' '}
              <a href="#" className="text-primary-600 hover:text-primary-700">Política de Privacidad</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
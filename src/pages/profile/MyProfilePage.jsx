import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileService } from '../../api/userProfileService';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import toast from 'react-hot-toast';
import {
  User, Mail, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Shield, Calendar,
} from 'lucide-react';

// ─── Badge de rol ─────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-300',
  admin:       'bg-purple-100 text-purple-600 border-purple-200',
  calidad:     'bg-amber-100  text-amber-700  border-amber-300',
  compras:     'bg-rose-100   text-rose-700   border-rose-300',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin:       'Administrador',
  calidad:     'Calidad',
  compras:     'Compras',
};

// ─── Sección con título ───────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children }) => (
  <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center justify-center rounded-lg shadow-sm w-9 h-9 bg-gradient-primary">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Campo de contraseña con toggle ──────────────────────────────────────────
const PasswordInput = ({ label, value, onChange, error, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block mb-1.5 text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || '••••••••'}
          className={`w-full pl-9 pr-10 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
            ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-300 focus:border-primary'}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="flex items-center gap-1 mt-1 text-xs text-red-600"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export const MyProfilePage = () => {
  const queryClient = useQueryClient();
  const { user: authUser, setAuth } = useAuthStore();

  // ─── Datos del perfil ───────────────────────────────────────────────────────
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: userProfileService.getProfile,
  });

  const profile = profileData?.user;

  // ─── Form info general ──────────────────────────────────────────────────────
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name   || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: userProfileService.updateProfile,
    onSuccess: (data) => {
      toast.success('Perfil actualizado correctamente');
      queryClient.invalidateQueries(['my-profile']);
      // ✅ Actualizar el store de auth para reflejar el nuevo nombre/email en el sidebar
      if (data.user) {
        const token = localStorage.getItem('token');
        setAuth(data.user, token);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al actualizar perfil');
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Nombre y correo son requeridos'); return; }
    updateProfileMutation.mutate({ name: name.trim(), email: email.trim() });
  };

  // ─── Form contraseña ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwErrors, setPwErrors] = useState({});

  const updatePasswordMutation = useMutation({
    mutationFn: userProfileService.updatePassword,
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
      setPwErrors({});
    },
    onError: (err) => {
      const errors = err.response?.data?.errors || {};
      setPwErrors(errors);
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    },
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!pwForm.current_password) newErrors.current_password = ['La contraseña actual es requerida'];
    if (!pwForm.password)         newErrors.password         = ['La nueva contraseña es requerida'];
    if (pwForm.password.length < 8 && pwForm.password) newErrors.password = ['Mínimo 8 caracteres'];
    if (pwForm.password !== pwForm.password_confirmation) newErrors.password_confirmation = ['Las contraseñas no coinciden'];
    if (Object.keys(newErrors).length > 0) { setPwErrors(newErrors); return; }
    setPwErrors({});
    updatePasswordMutation.mutate(pwForm);
  };

  const userRole = profile?.roles?.[0] || authUser?.roles?.[0] || '';
  const roleKey  = typeof userRole === 'string' ? userRole : userRole?.name || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 text-xl font-bold text-white rounded-full shadow-md bg-gradient-primary">
            {(profile?.name || authUser?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.name || authUser?.name}</h1>
            <p className="text-sm text-gray-500">{profile?.email || authUser?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[roleKey] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[roleKey] || roleKey}
              </span>
              {profile?.created_at && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  Desde {new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información General */}
      <Section icon={User} title="Información General">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nombre completo</label>
            <div className="relative">
              <User className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={updateProfileMutation.isPending}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </Section>

      {/* Cambiar Contraseña */}
      <Section icon={Lock} title="Cambiar Contraseña">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <PasswordInput
            label="Contraseña actual"
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            error={pwErrors.current_password?.[0]}
            placeholder="Tu contraseña actual"
          />

          <PasswordInput
            label="Nueva contraseña"
            value={pwForm.password}
            onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
            error={pwErrors.password?.[0]}
            placeholder="Mínimo 8 caracteres"
          />

          <PasswordInput
            label="Confirmar nueva contraseña"
            value={pwForm.password_confirmation}
            onChange={(e) => setPwForm({ ...pwForm, password_confirmation: e.target.value })}
            error={pwErrors.password_confirmation?.[0]}
            placeholder="Repite la nueva contraseña"
          />

          {/* Indicador de fortaleza */}
          {pwForm.password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[
                  pwForm.password.length >= 8,
                  /[A-Z]/.test(pwForm.password),
                  /[0-9]/.test(pwForm.password),
                  /[^A-Za-z0-9]/.test(pwForm.password),
                ].map((met, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${met ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Recomendado: mayúsculas, números y caracteres especiales
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={updatePasswordMutation.isPending}
              disabled={!pwForm.current_password || !pwForm.password || !pwForm.password_confirmation}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
};
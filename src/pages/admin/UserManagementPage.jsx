import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userService } from '../../api/userService';
import { providerAccountService } from '../../api/providerAccountService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { UserModal } from '../../components/users/UserModal';
import { PasswordModal } from '../../components/users/PasswordModal';
import { DeleteConfirmModal } from '../../components/users/DeleteConfirmModal';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../utils/toast';
import toast from 'react-hot-toast';
import {
  Users, Search, Plus, Edit, Trash2, Key, Power,
  UserCheck, UserX, Shield, Building2, Mail, Lock,
  Eye, EyeOff, AlertCircle, Loader2, Send,
} from 'lucide-react';

// ─── Modal reset de contraseña para proveedor ─────────────────────────────────
const ProviderPasswordModal = ({ isOpen, onClose, user }) => {
  const queryClient = useQueryClient();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [error, setError]         = useState('');

  const mutation = useMutation({
    mutationFn: (data) => providerAccountService.resetPassword(user.id, data),
    onSuccess: () => {
      showToast.success('Contraseña restablecida correctamente');
      queryClient.invalidateQueries(['provider-accounts']);
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Error al restablecer contraseña'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    mutation.mutate({ password, password_confirmation: confirm });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary"><Lock className="w-5 h-5 text-white" /></div>
        <div><p className="font-bold text-gray-900">Restablecer Contraseña</p><p className="text-xs text-gray-500">{user?.email}</p></div>
      </div>
    } size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button variant="primary" loading={mutation.isPending} onClick={handleSubmit}>Guardar</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nueva contraseña */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nueva contraseña</label>
          <div className="relative">
            <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full pl-9 pr-10 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {/* Confirmar */}
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type={showCf ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full pl-9 pr-10 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary" />
            <button type="button" onClick={() => setShowCf(!showCf)} className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2">
              {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
      </form>
    </Modal>
  );
};

// ─── Tab: Usuarios Internos (código original) ─────────────────────────────────
const InternalUsersTab = () => {
  const queryClient  = useQueryClient();
  const currentUser  = useAuthStore((state) => state.user);
  const [filters, setFilters]             = useState({ search: '', role: '', is_active: '' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [isEditing, setIsEditing]         = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.getUsers(filters),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => userService.toggleStatus(id),
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  const isCurrentUser  = (user) => user.id === currentUser?.id;
  const canDeleteUser  = (user) => !isCurrentUser(user);
  const canToggle      = (user) => !isCurrentUser(user);

  const getRoleBadgeVariant = (r) => ({ super_admin:'rejected', admin:'pending', compras:'info', calidad:'active' }[r] || 'info');
  const getRoleLabel        = (r) => ({ super_admin:'Super Admin', admin:'Administrador', compras:'Compras', calidad:'Calidad' }[r] || r);

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" /></div>;
  if (error)    return <div className="p-4 border-2 border-red-200 rounded-xl bg-red-50"><p className="text-red-700">{error.message}</p></div>;

  const users = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setSelectedUser(null); setIsEditing(false); setShowUserModal(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <Input placeholder="Buscar por nombre o email..." value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-10" />
          </div>
          <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <option value="">Todos los roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Administrador</option>
            <option value="compras">Compras</option>
            <option value="calidad">Calidad</option>
          </select>
          <select value={filters.is_active} onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <option value="">Todos los estados</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {['Usuario', 'Rol', 'Estado', 'Fecha de Registro', 'Acciones'].map(h => (
                  <th key={h} className={`px-6 py-3 text-xs font-semibold tracking-wider text-gray-600 uppercase ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center"><Users className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-gray-500">No se encontraron usuarios</p></td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${isCurrentUser(user) ? 'bg-primary-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      {isCurrentUser(user) && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-100 rounded-full"><Shield className="w-3 h-3" />Tú</span>}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4"><Badge variant={getRoleBadgeVariant(user.roles[0]?.name)}>{getRoleLabel(user.roles[0]?.name)}</Badge></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.is_active ? <><UserCheck className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-700">Activo</span></> : <><UserX className="w-4 h-4 text-red-500" /><span className="text-sm font-medium text-red-700">Inactivo</span></>}
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString('es-MX')}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelectedUser(user); setIsEditing(true); setShowUserModal(true); }} className="p-2 text-blue-600 rounded-lg hover:bg-blue-50" title="Editar"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50" title="Cambiar contraseña"><Key className="w-4 h-4" /></button>
                      <button onClick={() => toggleStatusMutation.mutate(user.id)} disabled={!canToggle(user) || toggleStatusMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${!canToggle(user) ? 'text-gray-300 cursor-not-allowed' : user.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={user.is_active ? 'Desactivar' : 'Activar'}><Power className="w-4 h-4" /></button>
                      <button onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} disabled={!canDeleteUser(user)}
                        className={`p-2 rounded-lg transition-colors ${!canDeleteUser(user) ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                        title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showUserModal    && <UserModal isOpen onClose={() => setShowUserModal(false)} user={selectedUser} isEditing={isEditing} />}
      {showPasswordModal && <PasswordModal isOpen onClose={() => setShowPasswordModal(false)} user={selectedUser} />}
      {showDeleteModal  && <DeleteConfirmModal isOpen onClose={() => setShowDeleteModal(false)} user={selectedUser} />}
    </div>
  );
};

// ─── Tab: Cuentas de Proveedores ──────────────────────────────────────────────
const ProviderAccountsTab = () => {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const [filters, setFilters]                   = useState({ search: '', is_active: '' });
  const [selectedUser, setSelectedUser]         = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sendingReset, setSendingReset]         = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-accounts', filters],
    queryFn: () => providerAccountService.getAll(filters),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => providerAccountService.toggleStatus(id),
    onSuccess: (data) => {
      showToast.success(data.message || 'Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['provider-accounts'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Error al cambiar estado';
      showToast.error(msg);
      console.error('Toggle error:', err.response?.data);
    },
  });

  const handleSendReset = async (user) => {
    setSendingReset(user.id);
    try {
      const res = await providerAccountService.sendReset(user.id);
      showToast.success(res.message);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Error al enviar correo');
    } finally {
      setSendingReset(null);
    }
  };

  const PROVIDER_STATUS = {
    active:   { label: 'Activo',    variant: 'active'   },
    pending:  { label: 'Pendiente', variant: 'pending'  },
    inactive: { label: 'Inactivo',  variant: 'inactive' },
    rejected: { label: 'Rechazado', variant: 'rejected' },
  };

  const accounts = data?.data || [];

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Buscar por nombre o email..."
              value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filters.is_active} onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
            <option value="">Todos los estados</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {['Cuenta', 'Proveedor Vinculado', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className={`px-6 py-3 text-xs font-semibold tracking-wider text-gray-600 uppercase ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center"><Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-gray-500">No se encontraron cuentas de proveedores</p></td></tr>
              ) : accounts.map((account) => {
                const provStatus = PROVIDER_STATUS[account.provider?.status] || { label: '—', variant: 'info' };
                return (
                  <tr key={account.id} className="hover:bg-gray-50">
                    {/* Cuenta */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </td>

                    {/* Proveedor vinculado */}
                    <td className="px-6 py-4">
                      {account.provider ? (
                        <button onClick={() => navigate(`/providers/${account.provider.id}`)}
                          className="text-left group">
                          <p className="text-sm font-semibold text-primary-600 group-hover:underline">{account.provider.business_name}</p>
                          <p className="font-mono text-xs text-gray-500">{account.provider.rfc}</p>
                          {account.provider.provider_type && (
                            <p className="text-xs text-gray-400">{account.provider.provider_type.name}</p>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs italic text-gray-400">Sin proveedor vinculado</span>
                      )}
                    </td>

                    {/* Estado — basado en provider.status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {account.provider?.status === 'active'
                          ? <><UserCheck className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-700">Activo</span></>
                          : account.provider?.status === 'pending'
                          ? <><UserX className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-amber-700">Pendiente</span></>
                          : account.provider?.status === 'rejected'
                          ? <><UserX className="w-4 h-4 text-red-500" /><span className="text-sm font-medium text-red-700">Rechazado</span></>
                          : <><UserX className="w-4 h-4 text-gray-400" /><span className="text-sm font-medium text-gray-600">Inactivo</span></>
                        }
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver proveedor */}
                        {account.provider && (
                          <button onClick={() => navigate(`/providers/${account.provider.id}`)}
                            className="p-2 rounded-lg text-primary-600 hover:bg-primary-50" title="Ver proveedor">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* Enviar email de reset */}
                        <button onClick={() => handleSendReset(account)}
                          disabled={sendingReset === account.id}
                          className="p-2 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50" title="Enviar email de reset">
                          {sendingReset === account.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        </button>

                        {/* Reset manual de contraseña */}
                        <button onClick={() => { setSelectedUser(account); setShowPasswordModal(true); }}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-50" title="Restablecer contraseña">
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Activar / Desactivar — basado en provider.status */}
                        <button onClick={() => toggleMutation.mutate(account.id)}
                          disabled={!account.provider || toggleMutation.isPending}
                          className={`p-2 rounded-lg transition-colors ${
                            !account.provider
                              ? 'text-gray-300 cursor-not-allowed'
                              : account.provider?.status === 'active'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={account.provider?.status === 'active' ? 'Desactivar cuenta' : 'Activar cuenta'}>
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showPasswordModal && selectedUser && (
        <ProviderPasswordModal isOpen onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }} user={selectedUser} />
      )}
    </div>
  );
};

// ─── Página principal con tabs ────────────────────────────────────────────────
export const UserManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'internal';

  const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });

  const tabs = [
    { id: 'internal',  label: 'Usuarios Internos',      icon: Users     },
    { id: 'providers', label: 'Cuentas de Proveedores', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-gray-600">Administra los usuarios internos y las cuentas de proveedores</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido del tab activo */}
      {activeTab === 'internal'  && <InternalUsersTab />}
      {activeTab === 'providers' && <ProviderAccountsTab />}
    </div>
  );
};
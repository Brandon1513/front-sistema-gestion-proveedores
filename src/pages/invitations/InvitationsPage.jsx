import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { InviteProviderModal } from '../../components/providers/InviteProviderModal';
import { invitationService } from '../../api/invitationService';
import toast from 'react-hot-toast';
import {
  Mail,
  Send,
  RefreshCw,
  XCircle,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    variant: 'warning',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  accepted: {
    label: 'Aceptada',
    variant: 'success',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: 'Expirada',
    variant: 'danger',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const daysUntilExpiry = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const InvitationsPage = () => {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['invitations', { status: statusFilter, provider_type_id: typeFilter }],
    queryFn: () =>
      invitationService.getAll({
        status: statusFilter || undefined,
        provider_type_id: typeFilter || undefined,
      }),
  });

  const resendMutation = useMutation({
    mutationFn: invitationService.resend,
    onSuccess: () => {
      toast.success('Invitación reenviada exitosamente');
      queryClient.invalidateQueries(['invitations']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al reenviar invitación');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: invitationService.cancel,
    onSuccess: () => {
      toast.success('Invitación cancelada');
      queryClient.invalidateQueries(['invitations']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al cancelar invitación');
    },
  });

  const handleResend = (invitation) => {
    if (window.confirm(`¿Reenviar invitación a ${invitation.email}?`)) {
      resendMutation.mutate(invitation.id);
    }
  };

  const handleCancel = (invitation) => {
    if (window.confirm(`¿Cancelar la invitación de ${invitation.email}? Esta acción no se puede deshacer.`)) {
      cancelMutation.mutate(invitation.id);
    }
  };

  // Filtrar por búsqueda local (email)
  const allInvitations = data?.data || [];
  const invitations = search
    ? allInvitations.filter((inv) =>
        inv.email.toLowerCase().includes(search.toLowerCase())
      )
    : allInvitations;

  // Stats rápidas
  const stats = {
    total: allInvitations.length,
    pending: allInvitations.filter((i) => i.status === 'pending').length,
    accepted: allInvitations.filter((i) => i.status === 'accepted').length,
    expired: allInvitations.filter((i) => i.status === 'expired').length,
  };

  // Tipos únicos para el filtro
  const providerTypes = [
    ...new Map(
      allInvitations
        .filter((i) => i.provider_type)
        .map((i) => [i.provider_type.id, i.provider_type])
    ).values(),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Invitaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invita proveedores y monitorea el estado de cada invitación
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)} variant="primary">
          <Send className="w-4 h-4 mr-2" />
          Nueva Invitación
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'Pendientes', value: stats.pending, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: 'Aceptadas', value: stats.accepted, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Expiradas', value: stats.expired, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} ${stat.border} border rounded-xl p-4`}
          >
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Buscar por correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filtro estado */}
          <div className="relative">
            <Filter className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 pr-8 text-sm bg-white border border-gray-300 rounded-lg appearance-none pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="accepted">Aceptadas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>

          {/* Filtro tipo */}
          {providerTypes.length > 0 && (
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos los tipos</option>
                {providerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-b-2 rounded-full animate-spin border-primary-600" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <p className="font-semibold">Error al cargar invitaciones</p>
            <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50">
              <Mail className="w-8 h-8 text-primary-400" />
            </div>
            <p className="text-base font-medium text-gray-700">No hay invitaciones</p>
            <p className="mt-1 text-sm text-gray-400">
              Envía la primera invitación haciendo clic en "Nueva Invitación"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Correo electrónico', 'Tipo de proveedor', 'Estado', 'Enviada', 'Expira', 'Proveedor', 'Acciones'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => {
                  const statusCfg = STATUS_CONFIG[invitation.status] || STATUS_CONFIG.expired;
                  const days = daysUntilExpiry(invitation.expires_at);
                  const isPending = invitation.status === 'pending';
                  const isAccepted = invitation.status === 'accepted';

                  return (
                    <tr key={invitation.id} className="transition-colors hover:bg-gray-50">
                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
                            <Mail className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {invitation.email}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {invitation.provider_type?.name || '—'}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                            ${invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${invitation.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                            ${invitation.status === 'expired' ? 'bg-red-100 text-red-800' : ''}
                          `}
                        >
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Enviada */}
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(invitation.created_at)}
                        </div>
                      </td>

                      {/* Expira */}
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {isAccepted ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-medium ${
                                days !== null && days <= 2
                                  ? 'text-red-600'
                                  : days !== null && days <= 5
                                  ? 'text-yellow-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {formatDate(invitation.expires_at)}
                            </span>
                            {isPending && days !== null && (
                              <span
                                className={`text-xs ${
                                  days <= 0
                                    ? 'text-red-500'
                                    : days <= 2
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                                }`}
                              >
                                {days <= 0
                                  ? 'Expirada'
                                  : days === 1
                                  ? 'Vence mañana'
                                  : `${days} días restantes`}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Proveedor vinculado */}
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {invitation.provider ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            {invitation.provider.business_name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin proveedor</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Reenviar — solo pendientes */}
                          {isPending && (
                            <button
                              onClick={() => handleResend(invitation)}
                              disabled={resendMutation.isPending}
                              className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 hover:text-primary-800 transition-colors"
                              title="Reenviar invitación"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancelar — solo pendientes */}
                          {isPending && (
                            <button
                              onClick={() => handleCancel(invitation)}
                              disabled={cancelMutation.isPending}
                              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Cancelar invitación"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Sin acciones para aceptadas/expiradas */}
                          {!isPending && (
                            <span className="text-xs italic text-gray-300">Sin acciones</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginación si hay data.meta */}
            {data?.meta && data.meta.last_page > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Mostrando {data.meta.from}–{data.meta.to} de {data.meta.total} invitaciones
                </p>
                <div className="flex gap-2">
                  <span className="text-xs text-gray-400">
                    Página {data.meta.current_page} de {data.meta.last_page}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de nueva invitación */}
      <InviteProviderModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          queryClient.invalidateQueries(['invitations']);
        }}
      />
    </div>
  );
};
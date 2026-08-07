import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerRequestService } from '../../api/providerRequestService';
import { Button } from '../../components/common/Button';
import { showToast } from '../../utils/toast';
import {
  Inbox, Clock, Mail, UserCheck, CheckCircle, XCircle,
  Building2, Tag, Calendar, User, Filter, Send,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:    { label: 'Pendiente de revisión',   color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock       },
  invited:    { label: 'Invitación enviada',       color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Mail        },
  registered: { label: 'Proveedor registrado',     color: 'bg-purple-100 text-purple-700 border-purple-200', icon: UserCheck },
  active:     { label: 'Proveedor activo',         color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  rejected:   { label: 'Rechazada',                color: 'bg-red-100 text-red-700 border-red-200',        icon: XCircle     },
};

const RejectModal = ({ request, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => providerRequestService.reject(request.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-requests-queue'] });
      showToast.success('Solicitud rechazada');
      onClose();
    },
    onError: (err) => showToast.error(err.response?.data?.message || 'Error al rechazar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Rechazar solicitud</h2>
        <p className="text-sm text-gray-600">
          Vas a rechazar la solicitud de <strong>{request.provider_business_name}</strong> hecha por {request.requested_by?.name}.
        </p>
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Motivo del rechazo *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Explica por qué se rechaza esta solicitud..."
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"/>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" loading={mutation.isPending} disabled={!reason.trim()}
            onClick={() => mutation.mutate()} className="flex-1">
            Confirmar rechazo
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

export const ProviderRequestsQueuePage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-requests-queue', statusFilter],
    queryFn: () => providerRequestService.getAll(statusFilter ? { status: statusFilter } : {}),
  });

  const requests = data?.requests || [];
  const pendingCount = data?.stats?.pending ?? 0;

  const approveMutation = useMutation({
    mutationFn: (id) => providerRequestService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-requests-queue'] });
      showToast.success('Solicitud aprobada — invitación enviada al proveedor');
    },
    onError: (err) => showToast.error(err.response?.data?.message || 'Error al aprobar'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Inbox className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Alta de Proveedor</h1>
            <p className="text-sm text-gray-600">Solicitudes hechas por el personal interno de Dasavena</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 text-sm font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-full">
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-xl">
        <Filter className="w-4 h-4 text-gray-500"/>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-400">
          <option value="pending">Pendientes</option>
          <option value="invited">Invitación enviada</option>
          <option value="registered">Proveedor registrado</option>
          <option value="active">Proveedor activo</option>
          <option value="rejected">Rechazadas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 rounded-full border-t-primary-600 animate-spin"/>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-500">No hay solicitudes con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="p-5 bg-white border-2 border-gray-200 rounded-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="flex-shrink-0 w-4 h-4 text-gray-400"/>
                      <p className="font-bold text-gray-900 truncate">{r.provider_business_name}</p>
                    </div>
                    <p className="text-sm text-gray-500">{r.provider_contact_name} · {r.provider_contact_phone} · {r.provider_contact_email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Tag className="w-3 h-3"/>{r.department?.name} · {r.provider_type?.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3"/>Solicitó: {r.requested_by?.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3"/>{r.created_at}
                      </span>
                    </div>
                    {r.notes && <p className="mt-2 text-xs italic text-gray-500">"{r.notes}"</p>}
                    {r.status === 'rejected' && r.rejection_reason && (
                      <div className="p-2 mt-2 text-xs text-red-700 border border-red-200 rounded-lg bg-red-50">
                        Motivo: {r.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5"/>{cfg.label}
                    </span>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" loading={approveMutation.isPending} leftIcon={<Send className="w-3.5 h-3.5"/>}
                          onClick={() => approveMutation.mutate(r.id)}>
                          Aprobar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setRejectTarget(r)}>
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectTarget && <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)}/>}
    </div>
  );
};
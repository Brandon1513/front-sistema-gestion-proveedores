import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { providerRequestService } from '../../api/providerRequestService';
import { Button } from '../../components/common/Button';
import {
  Send, Plus, Clock, Mail, UserCheck, CheckCircle, XCircle,
  Building2, Tag, Calendar,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:    { label: 'Pendiente de revisión',   color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock       },
  invited:    { label: 'Invitación enviada',       color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Mail        },
  registered: { label: 'Proveedor registrado',     color: 'bg-purple-100 text-purple-700 border-purple-200', icon: UserCheck },
  active:     { label: 'Proveedor activo',         color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  rejected:   { label: 'Rechazada',                color: 'bg-red-100 text-red-700 border-red-200',        icon: XCircle     },
};

export const MyProviderRequestsPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-provider-requests'],
    queryFn: providerRequestService.mine,
  });

  const requests = data?.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <Send className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes de Alta</h1>
            <p className="text-sm text-gray-600">Estatus de los proveedores que has solicitado dar de alta</p>
          </div>
        </div>
        <Button onClick={() => navigate('/request-provider')} leftIcon={<Plus className="w-4 h-4"/>}>
          Nueva Solicitud
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 rounded-full border-t-primary-600 animate-spin"/>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center bg-white border-2 border-gray-200 rounded-xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50">
            <Send className="w-8 h-8 text-primary-400"/>
          </div>
          <p className="text-base font-medium text-gray-700">Aún no has hecho ninguna solicitud</p>
          <p className="mt-1 text-sm text-gray-400">Crea una solicitud para pedir el alta de un proveedor</p>
          <Button onClick={() => navigate('/request-provider')} leftIcon={<Plus className="w-4 h-4"/>} className="mt-4">
            Nueva Solicitud
          </Button>
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
                    <p className="text-sm text-gray-500">{r.provider_contact_name} · {r.provider_contact_email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Tag className="w-3 h-3"/>{r.department?.name} · {r.provider_type?.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3"/>{r.created_at}
                      </span>
                    </div>
                    {r.status === 'rejected' && r.rejection_reason && (
                      <div className="p-2 mt-2 text-xs text-red-700 border border-red-200 rounded-lg bg-red-50">
                        Motivo: {r.rejection_reason}
                      </div>
                    )}
                    {r.provider && (
                      <div className="p-2 mt-2 text-xs text-purple-700 border border-purple-200 rounded-lg bg-purple-50">
                        Estado del proveedor en el sistema: <strong>{r.provider.status}</strong>
                      </div>
                    )}
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5"/>{cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
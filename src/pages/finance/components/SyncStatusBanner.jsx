import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { accountStatementService } from '../../../api/accountStatementService';

export const SyncStatusBanner = () => {
  const { data } = useQuery({
    queryKey: ['finance-sync-status'],
    queryFn: accountStatementService.getSyncStatus,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });

  if (!data?.stale) return null;

  const lastSync = data.last_full_sync_at
    ? new Date(data.last_full_sync_at).toLocaleString('es-MX')
    : 'sin registro';

  return (
    <div className="flex items-start gap-3 px-4 py-3 border border-amber-300 bg-amber-50 rounded-xl">
      <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
      <div className="text-sm text-amber-800">
        <p className="font-semibold">Los datos de NetSuite pueden estar desactualizados</p>
        <p>Última sincronización completa: {lastSync}. Si este aviso persiste, avisa a TI.</p>
      </div>
    </div>
  );
};
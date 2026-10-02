import { Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';

export const TYPE_LABELS = {
  faltante: 'Faltante',
  devolucion: 'Devolución',
  rechazo: 'Rechazo',
};

export const requestStatusInfo = {
  pending: { label: 'Pendiente', variant: 'pending', icon: Clock },
  in_review: { label: 'En revisión', variant: 'info', icon: AlertCircle },
  approved: { label: 'Aprobada', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazada', variant: 'rejected', icon: XCircle },
  sent_to_netsuite: { label: 'Enviada a NetSuite', variant: 'success', icon: Send },
};

export const REQUEST_STATUS_TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'in_review', label: 'En revisión' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'sent_to_netsuite', label: 'Enviadas a NetSuite' },
];

export const SUBMISSION_STATUS_TABS = [
  { id: 'submitted', label: 'Recibidas' },
  { id: 'captured', label: 'Capturadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'cancelled', label: 'Canceladas' },
];

export const SUBMISSION_STATUS_INFO = {
  submitted: { label: 'Recibida', variant: 'pending', icon: Clock },
  captured: { label: 'Capturada en NetSuite', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazada', variant: 'rejected', icon: XCircle },
  cancelled: { label: 'Cancelada', variant: 'inactive', icon: XCircle },
};

export const COMPLEMENT_STATUS_TABS = [
  { id: 'submitted', label: 'En revisión' },
  { id: 'approved', label: 'Validados' },
  { id: 'rejected', label: 'Rechazados' },
];

export const COMPLEMENT_STATUS_INFO = {
  submitted: { label: 'En revisión', variant: 'pending', icon: Clock },
  approved: { label: 'Validado', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rechazado', variant: 'rejected', icon: XCircle },
};

export const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estatus' },
  { value: 'pending', label: 'Solo pendientes de pago' },
  { value: 'paid', label: 'Solo pagadas' },
];

export const invoiceStatusVariant = (status) => {
  if (!status) return 'inactive';
  const s = status.toLowerCase();
  if (s.includes('pagado')) return 'success';
  if (s.includes('parcial')) return 'warning';
  if (s.includes('abierto') || s.includes('open')) return 'info';
  return 'inactive';
};
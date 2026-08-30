import type { BookingStatus, InvoiceStatus, PaymentTxnStatus, TicketStatus } from '../types/database';

const BOOKING_STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'badge-amber',
  confirmed: 'badge-blue',
  assigned: 'badge-blue',
  in_progress: 'badge-gold',
  completed: 'badge-green',
  cancelled: 'badge-red',
  rescheduled: 'badge-gray',
};

const PAYMENT_STATUS_STYLE: Record<PaymentTxnStatus, string> = {
  pending: 'badge-amber',
  successful: 'badge-green',
  failed: 'badge-red',
  refunded: 'badge-gray',
};

const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  unpaid: 'badge-amber',
  paid: 'badge-green',
  overdue: 'badge-red',
  void: 'badge-gray',
};

const TICKET_STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'badge-blue',
  in_progress: 'badge-gold',
  waiting_for_customer: 'badge-amber',
  resolved: 'badge-green',
  closed: 'badge-gray',
};

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

export function StatusBadge({ status, kind }: { status: string; kind: 'booking' | 'payment' | 'invoice' | 'ticket' }) {
  const map =
    kind === 'booking'
      ? BOOKING_STATUS_STYLE
      : kind === 'payment'
        ? PAYMENT_STATUS_STYLE
        : kind === 'invoice'
          ? INVOICE_STATUS_STYLE
          : TICKET_STATUS_STYLE;

  const cls = (map as Record<string, string>)[status] ?? 'badge-gray';
  return <span className={`badge ${cls}`}>{labelize(status)}</span>;
}

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Invoice } from '../../types/database';

export function InvoicesPage() {
  const { customerProfile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  useEffect(() => {
    async function load() {
      if (!customerProfile) return;
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false });
      setInvoices((data as Invoice[]) ?? []);
      setLoading(false);
    }
    load();
  }, [customerProfile]);

  if (loading) {
    return (
      <div className="card-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 0 }}>
        {invoices.length === 0 ? (
          <EmptyState icon="🧾" title="No invoices yet" message="Invoices generated for your bookings will appear here." />
        ) : (
          <div className="scroll-x">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td>
                    <td>{formatCurrency(inv.total, inv.currency)}</td>
                    <td>
                      <StatusBadge status={inv.status} kind="invoice" />
                    </td>
                    <td>{formatDate(inv.due_date)}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setViewing(inv)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <ConfirmDialog
        open={!!viewing}
        title={`Invoice ${viewing?.invoice_number ?? ''}`}
        message={
          viewing
            ? `Subtotal: ${formatCurrency(viewing.subtotal, viewing.currency)} · Discount: ${formatCurrency(
                viewing.discount,
                viewing.currency
              )} · Tax: ${formatCurrency(viewing.tax, viewing.currency)} · Total: ${formatCurrency(viewing.total, viewing.currency)}`
            : ''
        }
        confirmLabel="Close"
        onConfirm={() => setViewing(null)}
        onCancel={() => setViewing(null)}
      />
    </div>
  );
}

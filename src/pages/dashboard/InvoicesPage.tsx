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
        const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
        const [page, setPage] = useState(1);
        const [pageSize] = useState(10);
        const [totalCount, setTotalCount] = useState<number | null>(null);
        .order('created_at', { ascending: false });
      setInvoices((data as Invoice[]) ?? []);
          let sub: any;
          async function load() {
            if (!customerProfile) return;
            setLoading(true);
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            const q = supabase
              .from('invoices')
              .select('*', { count: 'exact' })
              .eq('customer_id', customerProfile.id)
              .order('created_at', { ascending: false })
              .range(from, to);
            const { data, count } = await q;
            setInvoices((data as Invoice[]) ?? []);
            setTotalCount(count ?? null);
            setLoading(false);

            // realtime subscription for invoices of this customer
            sub = supabase
              .channel('public:invoices')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `customer_id=eq.${customerProfile.id}` }, (payload) => {
                // simple reload on change
                load();
              })
              .subscribe();
          }
          load();
          return () => {
            if (sub) supabase.removeChannel(sub);
          };
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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label className="checkbox-row" style={{ alignItems: 'center' }}>
                <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}>
                  <option value="all">All statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="void">Void</option>
                </select>
              </label>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ color: 'var(--text-muted)' }}>Showing {invoices.length} / {totalCount ?? '—'}</span>
              </div>
            </div>
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

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && page * pageSize >= (totalCount ?? 0)}>Next</button>
            </div>
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

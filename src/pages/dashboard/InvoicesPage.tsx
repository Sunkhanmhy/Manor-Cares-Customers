import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Invoice } from '../../types/database';

export function InvoicesPage() {
  const { customerProfile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  useEffect(() => {
    async function load() {
      if (!customerProfile) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;
      if (error) {
        setInvoices([]);
        setTotalCount(null);
        setLoading(false);
        return;
      }

      setInvoices((data as Invoice[]) ?? []);
      setTotalCount(count ?? null);
      setLoading(false);
    }

    load();
  }, [customerProfile, page, pageSize, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="checkbox-row" style={{ alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | Invoice['status']);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
          </label>
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Showing {invoices.length} / {totalCount ?? '—'}
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 30, color: 'var(--text-muted)' }}>Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<Icon name="invoice" size={40} />} title="No data available. Update your record, now!" message="Invoices generated for your bookings will appear here." />
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
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '0.78125rem' }}
                        onClick={() => setViewing(inv)}
                      >
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

      {!loading && invoices.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={totalCount !== null && page * pageSize >= (totalCount ?? 0)}
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!viewing}
        title={`Invoice ${viewing?.invoice_number ?? ''}`}
        message={
          viewing
            ? `Subtotal: ${formatCurrency(viewing.subtotal, viewing.currency)} · Discount: ${formatCurrency(
                viewing.discount,
                viewing.currency
              )} · Tax: ${formatCurrency(viewing.tax, viewing.currency)} · Total: ${formatCurrency(
                viewing.total,
                viewing.currency
              )}`
            : ''
        }
        confirmLabel="Close"
        onConfirm={() => setViewing(null)}
        onCancel={() => setViewing(null)}
      />
    </div>
  );
}

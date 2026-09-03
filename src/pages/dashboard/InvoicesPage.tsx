import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { Payment } from '../../types/database';

export function InvoicesPage() {
  const { customerProfile } = useAuth();
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Payment['payment_status']>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!customerProfile) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerProfile.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (statusFilter !== 'all') {
      query = query.eq('payment_status', statusFilter);
    }

    if (methodFilter !== 'all') {
      query = query.eq('payment_method', methodFilter);
    }

    const { data, count, error } = await query;
    if (error) {
      setTransactions([]);
      setTotalCount(null);
      setLoading(false);
      return;
    }

    setTransactions((data as Payment[]) ?? []);
    setTotalCount(count ?? null);
    setLoading(false);
  }, [customerProfile, methodFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!customerProfile) return;

    const channel = supabase.channel(`customer-payments-${customerProfile.id}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `customer_id=eq.${customerProfile.id}`,
        },
        () => {
          void loadTransactions();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [customerProfile, loadTransactions]);

  const uniqueMethods = Array.from(new Set(transactions.map((item) => item.payment_method).filter(Boolean))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="field" style={{ minWidth: 180 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | Payment['payment_status']);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>

          <label className="field" style={{ minWidth: 180 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Method</span>
            <select
              className="input"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All methods</option>
              {uniqueMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Showing {transactions.length} / {totalCount ?? '—'}
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 30, color: 'var(--text-muted)' }}>Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={<Icon name="invoice" size={40} />} title="No data available. Update your record, now!" message="Your payment and transaction history will appear here." />
        ) : (
          <div className="scroll-x">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.payment_reference}</td>
                    <td>{formatCurrency(Number(entry.amount), entry.currency)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{entry.payment_method ?? '—'}</td>
                    <td>
                      <StatusBadge status={entry.payment_status} kind="payment" />
                    </td>
                    <td>{formatDateTime(entry.paid_at ?? entry.created_at).split(',')[0]}</td>
                    <td>{formatDateTime(entry.paid_at ?? entry.created_at).split(',')[1]?.trim() ?? '—'}</td>
                    <td>{entry.payment_method ? `${entry.payment_method} payment for service checkout` : 'Customer payment transaction'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {!loading && transactions.length > 0 && (
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
    </div>
  );
}

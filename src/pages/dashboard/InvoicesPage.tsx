import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { getNormalizedAuthEmail, resolveEmailScopedIdentity } from '../../lib/emailScopedIdentity';
import type { Payment } from '../../types/database';

export function InvoicesPage() {
  const { customerProfile, profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Payment['payment_status']>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(customerProfile?.id ?? null);

  const loadTransactions = useCallback(async () => {
    const authEmail = getNormalizedAuthEmail(user?.email, profile?.email);

    if (!authEmail) {
      setTransactions([]);
      setTotalCount(0);
      setResolvedCustomerId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const identity = await resolveEmailScopedIdentity({
      email: authEmail,
      fallbackProfileId: profile?.id ?? null,
      fallbackCustomerId: customerProfile?.id ?? null,
    });

    const customerId = identity.customerId;
    setResolvedCustomerId(customerId);

    if (!customerId) {
      setTransactions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
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
  }, [customerProfile?.id, methodFilter, page, pageSize, profile?.email, statusFilter, user?.email]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!resolvedCustomerId) return;

    const channel = supabase.channel(`customer-payments-${resolvedCustomerId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `customer_id=eq.${resolvedCustomerId}`,
        },
        () => {
          void loadTransactions();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [loadTransactions, resolvedCustomerId]);

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
        <div className="scroll-x">
          <table className="table-clean">
            <thead>
              <tr>
                <th>S/No.</th>
                <th>Payment Details</th>
                <th>Payment Date</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)', padding: '18px 14px' }}>Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '18px 14px' }}>
                    No data available. Update your record, now!
                  </td>
                </tr>
              ) : (
                transactions.map((entry, index) => (
                  <tr key={entry.id}>
                    <td data-label="S/No.">{(page - 1) * pageSize + index + 1}</td>
                    <td data-label="Payment Details">
                      <div style={{ fontWeight: 700 }}>{formatCurrency(Number(entry.amount), entry.currency)}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Ref: {entry.payment_reference}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                        Method: {entry.payment_method ?? 'N/A'}
                      </div>
                    </td>
                    <td data-label="Payment Date">{formatDateTime(entry.paid_at ?? entry.created_at)}</td>
                    <td data-label="Payment Status"><StatusBadge status={entry.payment_status} kind="payment" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

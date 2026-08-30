import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { Payment } from '../../types/database';

export function PaymentsPage() {
  const { customerProfile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!customerProfile) return;
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false });
      setPayments((data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, [customerProfile]);

  const totalPaid = payments.filter((p) => p.payment_status === 'successful').reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.payment_status === 'pending').reduce((s, p) => s + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="stat-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="stat-grid">
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>Total Paid</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--clr-green)' }}>{formatCurrency(totalPaid)}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>Pending Payments</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(pending)}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>Total Transactions</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{payments.length}</p>
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 0 }}>
        {payments.length === 0 ? (
          <EmptyState icon="💳" title="No payment history" message="Payments for your bookings will appear here." />
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
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.payment_reference}</td>
                    <td>{formatCurrency(p.amount, p.currency)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.payment_method ?? '—'}</td>
                    <td>
                      <StatusBadge status={p.payment_status} kind="payment" />
                    </td>
                    <td>{formatDateTime(p.paid_at ?? p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

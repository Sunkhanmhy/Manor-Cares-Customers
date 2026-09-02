import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { Payment, PricePlan, Profile } from '../../types/database';

export function PaymentsPage() {
  const { customerProfile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<PricePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState({ name: '', email: '', phone: '', details: '' });

  useEffect(() => {
    async function load() {
      if (!customerProfile) return;
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false });
      setPayments((data as Payment[]) ?? []);
      const plansRes = await supabase.from('price_plans').select('*').order('created_at', { ascending: true });
      setPlans((plansRes.data as PricePlan[]) ?? []);
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
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Paid</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--clr-green)' }}>{formatCurrency(totalPaid)}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Pending Payments</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700 }}>{formatCurrency(pending)}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Transactions</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700 }}>{payments.length}</p>
        </GlassCard>
      </div>

      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: 8 }}>Price Plans</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {plans.map((p) => (
            <GlassCard key={p.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{p.currency} {p.price.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-green)' }}>{formatCurrency(Number(p.price), p.currency)}</div>
              </div>
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>{f}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary">Choose</button>
                <button className="btn btn-ghost">Details</button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <GlassCard style={{ padding: 18, marginTop: 8 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Public Property Price Enquiry</h3>
        <p style={{ fontSize: '0.84375rem', color: 'var(--text-muted)', marginBottom: 10 }}>We'll auto-fill your details below.</p>
        <form onSubmit={async (e) => { e.preventDefault();
          await supabase.from('price_enquiries').insert({
            customer_id: customerProfile?.id ?? null,
            name: enquiry.name,
            email: enquiry.email,
            phone: enquiry.phone,
            details: enquiry.details,
          });
        }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input" placeholder="Name" value={enquiry.name} onChange={(e) => setEnquiry({ ...enquiry, name: e.target.value })} />
            <input className="input" placeholder="Email" value={enquiry.email} onChange={(e) => setEnquiry({ ...enquiry, email: e.target.value })} />
            <input className="input" placeholder="Phone" value={enquiry.phone} onChange={(e) => setEnquiry({ ...enquiry, phone: e.target.value })} />
            <select className="input" defaultValue="" onChange={(e) => setEnquiry({ ...enquiry, details: e.target.value })}>
              <option value="">Select property type</option>
              <option value="private">Private property</option>
              <option value="public">Public building</option>
            </select>
          </div>
          <textarea className="input" placeholder="Additional details" value={enquiry.details} onChange={(e) => setEnquiry({ ...enquiry, details: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">Submit Enquiry</button>
            <button type="button" className="btn btn-ghost" onClick={async () => {
              // autofill from profile
              if (!customerProfile) return;
              const { data } = await supabase.from('profiles').select('*').eq('id', customerProfile.profile_id).maybeSingle();
              const prof = data as Profile | null;
              if (prof) setEnquiry({ name: `${prof.first_name} ${prof.last_name}`, email: prof.email, phone: prof.phone ?? '', details: enquiry.details });
            }}>Auto-fill</button>
          </div>
        </form>
      </GlassCard>

        <GlassCard style={{ padding: 0 }}>
        {payments.length === 0 ? (
          <EmptyState icon={<Icon name="payments" size={40} />} title="No payment history" message="Payments for your bookings will appear here." />
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

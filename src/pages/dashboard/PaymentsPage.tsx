import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { Payment } from '../../types/database';

type PrivatePropertyCalc = {
  propertyType: 'house' | 'apartment' | 'airbnb' | 'other';
  bedrooms: number;
  kitchens: number;
  toilets: number;
  livingRooms: number;
};

type PublicPropertyCalc = {
  buildingCategory: 'office' | 'other';
  rooms: number;
  kitchens: number;
  toilets: number;
};

const STANDARD_PRIVATE_PLANS = [
  {
    name: 'Starter Plan',
    price: 59999,
    features: [
      'Up to 1 bedroom, 1 kitchen',
      'Maximum (1) restroom per visit',
      'Standard cleaning checklist',
      'Weekly or 4x-monthly visits',
      'Eco-friendly products',
      'Bespoke indoor cleaning',
      'Shared cleaning team',
      'Bespoke outdoor cleaning',
      'Emergency addons cleaning',
    ],
  },
  {
    name: 'Essential Plan',
    price: 99999,
    features: [
      'Up to 2 bedrooms, 1 kitchen',
      'Maximum (2) restrooms per visit',
      'Standard cleaning checklist',
      'Weekly or 4x-monthly visits',
      'Eco-friendly products',
      'Bespoke indoor cleaning',
      'Dedicated cleaning team',
      'Soft-upholsteries cleaning',
      'Bespoke outdoor cleaning',
      'Emergency addons cleaning',
    ],
  },
  {
    name: 'Signature Plan',
    price: 199999,
    features: [
      'Up to 4 bedrooms, 3 restrooms',
      'Deep-clean checklist add-ons',
      'Weekly or 4x-monthly visits',
      'Eco-friendly products',
      'Bespoke indoor sanitation',
      'Hard-upholsteries cleaning',
      'On-demand surface whitening',
      'Bespoke outdoor sanitation',
      'Emergency addons cleaning',
      'Priority scheduling & maintenance',
    ],
  },
  {
    name: 'Deluxe Plan',
    price: 299999,
    features: [
      'Up to 5 bedrooms, 4 restrooms',
      'Deep-clean checklist add-ons',
      'Weekly or 4x-monthly visits',
      'Eco-friendly products',
      'Bespoke indoor sanitation',
      'Hard-upholsteries cleaning',
      'On-demand surface whitening',
      'Bespoke outdoor sanitation',
      'Emergency addons cleaning',
      'Priority scheduling & maintenance',
    ],
  },
  {
    name: 'Estate Plan',
    price: 399999,
    features: [
      'Up to 7 bedrooms, 5 restrooms',
      'Deep-clean checklist add-ons',
      'Weekly or 4x-monthly visits',
      'Eco-friendly products',
      'Bespoke all-round sanitation',
      'Deep upholsteries cleaning',
      'On-demand surface whitening',
      'Emergency addons cleaning',
      'On-demand laundry addons services',
      'Priority scheduling & maintenance',
    ],
  },
  {
    name: 'Platinum Plan',
    price: 699999,
    features: [
      'Unlimited bedrooms & restrooms',
      'Deep-clean checklist add-ons',
      'Bi-weekly or 8x-monthly visits',
      'Eco-friendly products',
      'Bespoke all-round sanitation',
      'Deep upholsteries cleaning',
      'On-demand surface whitening',
      'Emergency addons cleaning',
      'On-demand laundry addons services',
      'Dedicated account manager',
    ],
  },
] as const;

const PRIVATE_TYPE_MULTIPLIER: Record<PrivatePropertyCalc['propertyType'], number> = {
  house: 1,
  apartment: 1.5,
  airbnb: 2,
  other: 2,
};

const PUBLIC_TYPE_MULTIPLIER: Record<PublicPropertyCalc['buildingCategory'], number> = {
  office: 1,
  other: 1.5,
};

export function PaymentsPage() {
  const { customerProfile, profile, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [privateCalc, setPrivateCalc] = useState<PrivatePropertyCalc>({
    propertyType: 'house',
    bedrooms: 3,
    kitchens: 1,
    toilets: 2,
    livingRooms: 1,
  });

  const [publicCalc, setPublicCalc] = useState<PublicPropertyCalc>({
    buildingCategory: 'office',
    rooms: 10,
    kitchens: 1,
    toilets: 4,
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [privateCheckoutNote, setPrivateCheckoutNote] = useState('');
  const [publicCheckoutNote, setPublicCheckoutNote] = useState('');

  const customerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || user?.email?.split('@')[0] || 'Customer';

  useEffect(() => {
    async function load() {
      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false });

      setPayments((data as Payment[]) ?? []);
      setLoading(false);

    }

    void load();
  }, [customerProfile, profile, user, customerName]);

  const totalPaid = payments.filter((p) => p.payment_status === 'successful').reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payments.filter((p) => p.payment_status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);

  const privateTotal = useMemo(() => {
    const subtotal = privateCalc.bedrooms * 10 + privateCalc.kitchens * 10 + privateCalc.toilets * 5 + privateCalc.livingRooms * 10;
    return Math.round(subtotal * PRIVATE_TYPE_MULTIPLIER[privateCalc.propertyType]);
  }, [privateCalc]);

  const publicTotal = useMemo(() => {
    const subtotal = publicCalc.rooms * 15 + publicCalc.kitchens * 10 + publicCalc.toilets * 10;
    return Math.round(subtotal * PUBLIC_TYPE_MULTIPLIER[publicCalc.buildingCategory]);
  }, [publicCalc]);

  async function handleCheckout(type: 'private' | 'public', total: number, setMessage: (message: string) => void) {
    if (!customerProfile) {
      setMessage('Customer profile is not ready. Please refresh and sign in again.');
      return;
    }

    const paymentReference = `PAY-${type.toUpperCase()}-${Date.now()}`;
    const { error } = await supabase.from('payments').insert({
      customer_id: customerProfile.id,
      booking_id: null,
      payment_reference: paymentReference,
      amount: total,
      currency: 'NGN',
      payment_method: paymentMethod,
      payment_status: 'pending',
      paid_at: null,
    } as any);

    if (error) {
      setMessage(`Payment checkout failed: ${error.message}`);
      return;
    }

    setMessage(`Checkout synced for ${formatCurrency(total)} — reference: ${paymentReference} (${paymentMethod}).`);
  }

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

      <GlassCard style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payments</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>Standard payment plans for moderate and modern private properties</h3>
          </div>
          <div className="badge badge-blue">Customer: {customerName}</div>
        </div>
      </GlassCard>

      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: 10 }}>Standard Private Properties</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 14 }}>
          {STANDARD_PRIVATE_PLANS.map((plan) => (
            <GlassCard key={plan.name} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{plan.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Flexible & tailored</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-green)' }}>{formatCurrency(plan.price)}</div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.features.map((feature, index) => (
                  <li key={`${plan.name}-${index}`} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{feature}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn btn-primary">Choose</button>
                <button type="button" className="btn btn-ghost">Details</button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="home" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Private Properties Calculator</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              <span>Property Type</span>
              <select
                className="input"
                value={privateCalc.propertyType}
                onChange={(e) => setPrivateCalc((prev) => ({ ...prev, propertyType: e.target.value as PrivatePropertyCalc['propertyType'] }))}
              >
                <option value="house">Home</option>
                <option value="apartment">Apartment</option>
                <option value="airbnb">Airbnb</option>
                <option value="other">Others</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Bedrooms</span>
                <input type="number" min={0} className="input" value={privateCalc.bedrooms} onChange={(e) => setPrivateCalc((prev) => ({ ...prev, bedrooms: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Kitchen</span>
                <input type="number" min={0} className="input" value={privateCalc.kitchens} onChange={(e) => setPrivateCalc((prev) => ({ ...prev, kitchens: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Toilet</span>
                <input type="number" min={0} className="input" value={privateCalc.toilets} onChange={(e) => setPrivateCalc((prev) => ({ ...prev, toilets: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Living Rooms</span>
                <input type="number" min={0} className="input" value={privateCalc.livingRooms} onChange={(e) => setPrivateCalc((prev) => ({ ...prev, livingRooms: Number(e.target.value || 0) }))} />
              </label>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Estimated total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(privateTotal)}</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="payments" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Checkout</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <span style={{ color: 'var(--text-muted)' }}>Real-time total</span>
              <strong>{formatCurrency(privateTotal)}</strong>
            </div>

            <label className="field">
              <span>Payment method</span>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="wallet">Wallet</option>
              </select>
            </label>

            <div style={{ background: 'rgba(18,163,117,0.12)', border: '1px solid rgba(18,163,117,0.3)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: 700 }}>{customerName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || profile?.email || 'No email on record'}</div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCheckout('private', privateTotal, setPrivateCheckoutNote)}
            >
              Proceed to payment
            </button>

            {privateCheckoutNote && (
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-green)', background: 'rgba(18,163,117,0.07)', border: '1px solid rgba(18,163,117,0.22)', padding: 10, borderRadius: 10 }}>
                {privateCheckoutNote}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="building" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Public Properties Calculator</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              <span>Building Category</span>
              <select
                className="input"
                value={publicCalc.buildingCategory}
                onChange={(e) => setPublicCalc((prev) => ({ ...prev, buildingCategory: e.target.value as PublicPropertyCalc['buildingCategory'] }))}
              >
                <option value="office">Corporate / Office</option>
                <option value="other">Government / Individual / Other</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Room</span>
                <input type="number" min={0} className="input" value={publicCalc.rooms} onChange={(e) => setPublicCalc((prev) => ({ ...prev, rooms: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Kitchen</span>
                <input type="number" min={0} className="input" value={publicCalc.kitchens} onChange={(e) => setPublicCalc((prev) => ({ ...prev, kitchens: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Toilet</span>
                <input type="number" min={0} className="input" value={publicCalc.toilets} onChange={(e) => setPublicCalc((prev) => ({ ...prev, toilets: Number(e.target.value || 0) }))} />
              </label>
              <label className="field">
                <span>Multiplier</span>
                <input className="input" value={PUBLIC_TYPE_MULTIPLIER[publicCalc.buildingCategory]} readOnly />
              </label>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Estimated total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(publicTotal)}</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="payments" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Checkout</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <span style={{ color: 'var(--text-muted)' }}>Real-time total</span>
              <strong>{formatCurrency(publicTotal)}</strong>
            </div>

            <label className="field">
              <span>Payment method</span>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="wallet">Wallet</option>
              </select>
            </label>

            <div style={{ background: 'rgba(18,163,117,0.12)', border: '1px solid rgba(18,163,117,0.3)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: 700 }}>{customerName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || profile?.email || 'No email on record'}</div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCheckout('public', publicTotal, setPublicCheckoutNote)}
            >
              Proceed to payment
            </button>

            {publicCheckoutNote && (
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-green)', background: 'rgba(18,163,117,0.07)', border: '1px solid rgba(18,163,117,0.22)', padding: 10, borderRadius: 10 }}>
                {publicCheckoutNote}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 0 }}>
        {payments.length === 0 ? (
          <EmptyState icon={<Icon name="payments" size={40} />} title="No data available. Update your record, now!" message="Payments for your bookings will appear here." />
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

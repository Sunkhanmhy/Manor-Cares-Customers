import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import Icon from '../../components/Icon';
import { formatCurrency } from '../../lib/format';
import { getNormalizedAuthEmail, resolveEmailScopedIdentity } from '../../lib/emailScopedIdentity';
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

const PLAN_STYLES = [
  { bg: 'linear-gradient(145deg, rgba(245,158,11,0.2), rgba(245,158,11,0.06))', border: '1px solid rgba(245,158,11,0.42)' },
  { bg: 'linear-gradient(145deg, rgba(251,113,133,0.2), rgba(251,113,133,0.06))', border: '1px solid rgba(251,113,133,0.42)' },
  { bg: 'linear-gradient(145deg, rgba(52,211,153,0.2), rgba(52,211,153,0.06))', border: '1px solid rgba(52,211,153,0.42)' },
  { bg: 'linear-gradient(145deg, rgba(167,139,250,0.2), rgba(167,139,250,0.06))', border: '1px solid rgba(167,139,250,0.42)' },
  { bg: 'linear-gradient(145deg, rgba(96,165,250,0.2), rgba(96,165,250,0.06))', border: '1px solid rgba(96,165,250,0.42)' },
  { bg: 'linear-gradient(145deg, rgba(45,212,191,0.2), rgba(45,212,191,0.06))', border: '1px solid rgba(45,212,191,0.42)' },
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
      const identity = await resolveEmailScopedIdentity({
        email: getNormalizedAuthEmail(user?.email, profile?.email),
        fallbackProfileId: profile?.id ?? null,
        fallbackCustomerId: customerProfile?.id ?? null,
      });

      if (!identity.customerId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', identity.customerId)
        .order('created_at', { ascending: false });

      setPayments((data as Payment[]) ?? []);
      setLoading(false);

    }

    void load();
  }, [customerProfile?.id, customerName, profile?.id, profile?.email, user?.email]);

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

  const formatUsd = (amount: number) => formatCurrency(amount, 'USD');

  async function handleCheckout(type: 'private' | 'public', total: number, setMessage: (message: string) => void) {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
      fallbackCustomerId: customerProfile?.id ?? null,
    });

    if (!identity.customerId) {
      setMessage('Customer profile is not ready. Please refresh and sign in again.');
      return;
    }

    const paymentReference = `PAY-${type.toUpperCase()}-${Date.now()}`;
    const { error } = await supabase.from('payments').insert({
      customer_id: identity.customerId,
      booking_id: null,
      payment_reference: paymentReference,
      amount: total,
      currency: 'USD',
      payment_method: paymentMethod,
      payment_status: 'pending',
      paid_at: null,
    } as any);

    if (error) {
      setMessage(`Payment checkout failed: ${error.message}`);
      return;
    }

    setMessage(`Checkout synced for ${formatUsd(total)} — reference: ${paymentReference} (${paymentMethod}).`);
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
      <GlassCard style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payments</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>Standard General Plans</h3>
          </div>
          <div className="badge badge-blue">Customer: {customerName}</div>
        </div>
      </GlassCard>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 14 }}>
          {STANDARD_PRIVATE_PLANS.map((plan, index) => (
            <GlassCard key={plan.name} style={{ padding: 16, background: PLAN_STYLES[index].bg, border: PLAN_STYLES[index].border }}>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatUsd(privateTotal)}</div>
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
              <strong>{formatUsd(privateTotal)}</strong>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatUsd(publicTotal)}</div>
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
              <strong>{formatUsd(publicTotal)}</strong>
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

      <div className="stat-grid" style={{ marginTop: 10 }}>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Paid</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--clr-green)' }}>{formatCurrency(totalPaid, 'USD')}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Pending Payments</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700 }}>{formatCurrency(pending, 'USD')}</p>
        </GlassCard>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Transactions</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700 }}>{payments.length}</p>
        </GlassCard>
      </div>
    </div>
  );
}

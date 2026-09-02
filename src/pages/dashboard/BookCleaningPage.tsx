import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import { formatCurrency } from '../../lib/format';
import Icon from '../../components/Icon';
import type { Address, CleaningService } from '../../types/database';

const PROPERTY_TYPES: Array<{ value: 'apartment' | 'house' | 'office' | 'airbnb' | 'other'; label: string }> = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'office', label: 'Office' },
  { value: 'airbnb', label: 'Airbnb / Short-let' },
  { value: 'other', label: 'Other' },
];

const ROOM_RATE = 2000;
const BATHROOM_RATE = 1500;

export function BookCleaningPage() {
  const { customerProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [services, setServices] = useState<CleaningService[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]['value']>('apartment');
  const [addressId, setAddressId] = useState<number | 'new'>('new');
  const [customAddress, setCustomAddress] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [rooms, setRooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [additionalServiceIds, setAdditionalServiceIds] = useState<number[]>([]);
  const [instructions, setInstructions] = useState('');
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedNumber, setConfirmedNumber] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [servicesRes, addressesRes] = await Promise.all([
        supabase.from('cleaning_services').select('*').eq('is_active', true).order('display_order'),
        customerProfile
          ? supabase.from('addresses').select('*').eq('profile_id', customerProfile.profile_id).order('is_default', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      const svc = (servicesRes.data as CleaningService[]) ?? [];
      setServices(svc);
      if (svc.length) setServiceId(svc[0].id);
      const addr = (addressesRes.data as Address[]) ?? [];
      setAddresses(addr);
      if (addr.length) setAddressId(addr.find((a) => a.is_default)?.id ?? addr[0].id);
      setLoadingOptions(false);
    }
    load();
  }, [customerProfile]);

  const selectedService = services.find((s) => s.id === serviceId);
  const additionalServices = services.filter((s) => additionalServiceIds.includes(s.id));

  const estimatedPrice = useMemo(() => {
    const base = selectedService?.base_price ?? 0;
    const roomsCost = Math.max(0, rooms - 1) * ROOM_RATE;
    const bathroomsCost = Math.max(0, bathrooms - 1) * BATHROOM_RATE;
    const addOns = additionalServices.reduce((sum, s) => sum + Number(s.base_price), 0);
    return base + roomsCost + bathroomsCost + addOns;
  }, [selectedService, rooms, bathrooms, additionalServices]);

  const resolvedAddress = addressId === 'new' ? customAddress : addresses.find((a) => a.id === addressId)?.address_line ?? '';

  function toggleAdditionalService(id: number) {
    setAdditionalServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validateForm(): string | null {
    if (!serviceId) return 'Please select a cleaning service.';
    if (!bookingDate) return 'Please choose a date.';
    if (!bookingTime) return 'Please choose a time.';
    if (!resolvedAddress.trim()) return 'Please provide a service address.';
    return null;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    setStep('summary');
  }

  async function handleConfirm() {
    if (!customerProfile || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerProfile.id,
          service_id: serviceId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          property_type: propertyType,
          property_address: resolvedAddress,
          number_of_rooms: rooms,
          number_of_bathrooms: bathrooms,
          additional_services: additionalServices.map((s) => s.name),
          special_instructions: instructions.trim() || null,
          estimated_price: estimatedPrice,
        })
        .select('booking_number')
        .single();

      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id: customerProfile.profile_id,
        type: 'booking_confirmed',
        title: 'Booking Received',
        message: `Your booking ${data.booking_number} has been received and is pending confirmation.`,
      });

      setConfirmedNumber(data.booking_number);
    } catch {
      toast.error('We could not create your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={30} />
      </div>
    );
  }

  if (confirmedNumber) {
    return (
      <GlassCard style={{ padding: 40, maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}><Icon name="check" size={48} /></div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Booking Confirmed!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem', marginBottom: 6 }}>Your booking reference is</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-green)', marginBottom: 24 }}>{confirmedNumber}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/bookings')}>
            View My Bookings
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </GlassCard>
    );
  }

  if (step === 'summary') {
    return (
      <GlassCard style={{ padding: 28, maxWidth: 560 }}>
        <h2 style={{ fontSize: '1.1875rem', marginBottom: 18 }}>Booking Summary</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84375rem', marginBottom: 22 }}>
          <SummaryRow label="Service" value={selectedService?.name ?? '—'} />
          <SummaryRow label="Property Type" value={PROPERTY_TYPES.find((p) => p.value === propertyType)?.label ?? ''} />
          <SummaryRow label="Date & Time" value={`${bookingDate} at ${bookingTime}`} />
          <SummaryRow label="Address" value={resolvedAddress} />
          <SummaryRow label="Bedrooms / Bathrooms" value={`${rooms} / ${bathrooms}`} />
          {additionalServices.length > 0 && (
            <SummaryRow label="Additional Services" value={additionalServices.map((s) => s.name).join(', ')} />
          )}
          {instructions && <SummaryRow label="Special Instructions" value={instructions} />}
          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />
          <SummaryRow label="Estimated Price" value={formatCurrency(estimatedPrice)} bold />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-success" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Spinner size={16} /> : 'Confirm Booking'}
          </button>
          <button className="btn btn-ghost" onClick={() => setStep('form')} disabled={submitting}>
            Back to Edit
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
      <GlassCard style={{ padding: 28, maxWidth: 640 }}>
        <h2 style={{ fontSize: '1.1875rem', marginBottom: 20 }}>Book a Cleaning Service</h2>
      <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="field">
          <label>Cleaning Service</label>
          <select className="input" value={serviceId ?? ''} onChange={(e) => setServiceId(Number(e.target.value))}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCurrency(s.base_price)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Property Type</label>
            <select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}>
              {PROPERTY_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Address</label>
            <select
              className="input"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value === 'new' ? 'new' : Number(e.target.value))}
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.address_line}, {a.city}
                </option>
              ))}
              <option value="new">Enter a new address…</option>
            </select>
          </div>
        </div>

        {addressId === 'new' && (
          <div className="field">
            <label>New Address</label>
            <input className="input" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              className="input"
              value={bookingDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Time</label>
            <input type="time" className="input" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
          </div>
          <div className="field">
            <label>Number of Bedrooms</label>
            <input
              type="number"
              min={0}
              className="input"
              value={rooms}
              onChange={(e) => setRooms(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="field">
            <label>Number of Bathrooms</label>
            <input
              type="number"
              min={0}
              className="input"
              value={bathrooms}
              onChange={(e) => setBathrooms(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        {services.length > 1 && (
          <div className="field">
            <label>Additional Services</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {services
                .filter((s) => s.id !== serviceId)
                .map((s) => (
                  <label key={s.id} className="checkbox-row">
                    <input type="checkbox" checked={additionalServiceIds.includes(s.id)} onChange={() => toggleAdditionalService(s.id)} />
                    {s.name} (+{formatCurrency(s.base_price)})
                  </label>
                ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>Special Cleaning Requirements</label>
          <textarea className="input" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>

        <GlassCard style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.84375rem', color: 'var(--text-muted)' }}>Estimated Price</span>
          <strong style={{ fontSize: '1.125rem', color: 'var(--clr-green)' }}>{formatCurrency(estimatedPrice)}</strong>
        </GlassCard>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          Review Booking
        </button>
      </form>
    </GlassCard>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

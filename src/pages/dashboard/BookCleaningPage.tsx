import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import Icon from '../../components/Icon';
import type { Address, CleaningService } from '../../types/database';

type BookingFormMode = 'private' | 'public';

type PrivatePropertyForm = {
  customer_name: string;
  phone: string;
  email: string;
  property_type: 'house' | 'apartment' | 'airbnb' | 'other';
  service_name: string;
  home_style: string;
  bedrooms: number;
  kitchens: number;
  toilets: number;
  living_rooms: number;
  furniture_included: boolean;
  outdoor_cleaning: boolean;
  indoor_cleaning: boolean;
  billing_cycle: 'one-time' | 'monthly';
  booking_date: string;
  booking_time: string;
  notes: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

type PublicPropertyForm = {
  customer_name: string;
  phone: string;
  email: string;
  property_type: 'office' | 'other';
  property_category: string;
  building_name: string;
  floors: number;
  rooms: number;
  kitchens: number;
  toilets: number;
  parking_area: boolean;
  outdoor_cleaning: boolean;
  indoor_cleaning: boolean;
  furniture_included: boolean;
  billing_cycle: 'one-time' | 'monthly';
  booking_date: string;
  booking_time: string;
  notes: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

const BASE_PRIVATE_FORM: PrivatePropertyForm = {
  customer_name: '',
  phone: '',
  email: '',
  property_type: 'house',
  service_name: 'Private Home Cleaning',
  home_style: 'Detached home',
  bedrooms: 3,
  kitchens: 1,
  toilets: 2,
  living_rooms: 1,
  furniture_included: true,
  outdoor_cleaning: true,
  indoor_cleaning: true,
  billing_cycle: 'monthly',
  booking_date: '',
  booking_time: '09:00',
  notes: '',
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
};

const BASE_PUBLIC_FORM: PublicPropertyForm = {
  customer_name: '',
  phone: '',
  email: '',
  property_type: 'office',
  property_category: 'Corporate office',
  building_name: '',
  floors: 2,
  rooms: 10,
  kitchens: 1,
  toilets: 4,
  parking_area: true,
  outdoor_cleaning: true,
  indoor_cleaning: true,
  furniture_included: true,
  billing_cycle: 'monthly',
  booking_date: '',
  booking_time: '09:00',
  notes: '',
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
};

export function BookCleaningPage() {
  const { profile, user, customerProfile } = useAuth();
  const toast = useToast();

  const [services, setServices] = useState<CleaningService[]>([]);
  const [loading, setLoading] = useState(true);
  const [privateForm, setPrivateForm] = useState<PrivatePropertyForm>(BASE_PRIVATE_FORM);
  const [publicForm, setPublicForm] = useState<PublicPropertyForm>(BASE_PUBLIC_FORM);
  const [submitting, setSubmitting] = useState<BookingFormMode | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const profileId = profile?.id;
      const [addressRes, serviceRes] = await Promise.all([
        profileId
          ? supabase.from('addresses').select('*').eq('profile_id', profileId).order('is_default', { ascending: false }).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Address[] }),
        supabase.from('cleaning_services').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      ]);

      if (!active) return;

      const addressList = ((addressRes as { data?: Array<{ is_default?: boolean; address_line?: string | null; city?: string | null; state?: string | null; country?: string | null; postal_code?: string | null }> }).data ?? []);
      const primaryAddress = addressList.find((address) => address.is_default) ?? addressList[0];
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
      const defaultAddressLine = primaryAddress?.address_line ?? profile?.address_line ?? '';
      const defaultCity = primaryAddress?.city ?? profile?.city ?? '';
      const defaultState = primaryAddress?.state ?? profile?.state ?? '';
      const defaultCountry = primaryAddress?.country ?? profile?.country ?? 'Nigeria';
      const defaultPostalCode = primaryAddress?.postal_code ?? profile?.postal_code ?? '';

      const autoFill = {
        customer_name: fullName || user?.email?.split('@')[0] || 'Customer',
        phone: profile?.phone ?? '',
        email: user?.email ?? profile?.email ?? '',
        address_line: defaultAddressLine,
        city: defaultCity,
        state: defaultState,
        country: defaultCountry,
        postal_code: defaultPostalCode,
      };

      setServices((serviceRes.data as CleaningService[]) ?? []);
      setPrivateForm((prev) => ({ ...prev, ...autoFill }));
      setPublicForm((prev) => ({ ...prev, ...autoFill }));
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [profile, user]);

  const formatSummaryText = (mode: BookingFormMode, form: PrivatePropertyForm | PublicPropertyForm) => {
    if (mode === 'private') {
      const privateFormData = form as PrivatePropertyForm;
      return [
        `Private property cleaning`,
        `Home style: ${privateFormData.home_style}`,
        `Bedrooms: ${privateFormData.bedrooms}`,
        `Kitchens: ${privateFormData.kitchens}`,
        `Toilets: ${privateFormData.toilets}`,
        `Living rooms: ${privateFormData.living_rooms}`,
        `Furniture included: ${privateFormData.furniture_included ? 'Yes' : 'No'}`,
        `Outdoor cleaning: ${privateFormData.outdoor_cleaning ? 'Yes' : 'No'}`,
        `Indoor cleaning: ${privateFormData.indoor_cleaning ? 'Yes' : 'No'}`,
        `Billing cycle: ${privateFormData.billing_cycle}`,
        privateFormData.notes || 'No special instructions',
      ].join(' | ');
    }

    const publicFormData = form as PublicPropertyForm;
    return [
      `Public property cleaning`,
      `Category: ${publicFormData.property_category}`,
      `Building: ${publicFormData.building_name || 'Not specified'}`,
      `Floors: ${publicFormData.floors}`,
      `Rooms: ${publicFormData.rooms}`,
      `Kitchens: ${publicFormData.kitchens}`,
      `Toilets: ${publicFormData.toilets}`,
      `Parking area: ${publicFormData.parking_area ? 'Yes' : 'No'}`,
      `Outdoor cleaning: ${publicFormData.outdoor_cleaning ? 'Yes' : 'No'}`,
      `Indoor cleaning: ${publicFormData.indoor_cleaning ? 'Yes' : 'No'}`,
      `Billing cycle: ${publicFormData.billing_cycle}`,
      publicFormData.notes || 'No special instructions',
    ].join(' | ');
  };

  async function submitBooking(mode: BookingFormMode) {
    if (!customerProfile) {
      toast.error('Your customer profile is not ready yet. Please refresh your session and try again.');
      return;
    }

    const privateFormData = privateForm;
    const publicFormData = publicForm;
    const form = mode === 'private' ? privateFormData : publicFormData;
    const selectedService = services.find((service) => {
      const name = service.name.toLowerCase();
      return mode === 'private' ? name.includes('private') || name.includes('home') : name.includes('public') || name.includes('commercial') || name.includes('office');
    }) ?? services[0];

    if (!selectedService) {
      toast.error('No cleaning service is available in the catalog yet.');
      return;
    }

    if (!form.booking_date || !form.booking_time) {
      toast.error('Please select a service date and time before submitting.');
      return;
    }

    setSubmitting(mode);

    try {
      const propertyAddress = [form.address_line, form.city, form.state, form.country, form.postal_code].filter(Boolean).join(', ');

      const bookingPayload: any = mode === 'private'
        ? {
            customer_id: customerProfile.id,
            service_id: selectedService.id,
            booking_date: privateFormData.booking_date,
            booking_time: privateFormData.booking_time,
            property_type: privateFormData.property_type,
            property_address: propertyAddress || 'Address not provided',
            number_of_rooms: Number(privateFormData.bedrooms || 0),
            number_of_bathrooms: Number(privateFormData.toilets || 1),
            additional_services: [
              privateFormData.home_style || 'Home cleaning',
              privateFormData.outdoor_cleaning ? 'Outdoor cleaning' : null,
              privateFormData.indoor_cleaning ? 'Indoor cleaning' : null,
              privateFormData.furniture_included ? 'Furniture care' : null,
            ].filter(Boolean) as string[],
            special_instructions: formatSummaryText('private', privateFormData),
            estimated_price: selectedService.base_price,
            payment_status: 'unpaid',
            booking_status: 'pending',
          }
        : {
            customer_id: customerProfile.id,
            service_id: selectedService.id,
            booking_date: publicFormData.booking_date,
            booking_time: publicFormData.booking_time,
            property_type: publicFormData.property_type,
            property_address: propertyAddress || 'Address not provided',
            number_of_rooms: Number(publicFormData.rooms || 0),
            number_of_bathrooms: Number(publicFormData.toilets || 1),
            additional_services: [
              publicFormData.property_category || 'Public property cleaning',
              publicFormData.outdoor_cleaning ? 'Outdoor cleaning' : null,
              publicFormData.indoor_cleaning ? 'Indoor cleaning' : null,
              publicFormData.furniture_included ? 'Furniture care' : null,
              publicFormData.parking_area ? 'Parking area cleaning' : null,
            ].filter(Boolean) as string[],
            special_instructions: formatSummaryText('public', publicFormData),
            estimated_price: selectedService.base_price,
            payment_status: 'unpaid',
            booking_status: 'pending',
          };

      const { error } = await supabase.from('bookings').insert(bookingPayload as any);

      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id: profile!.id,
        type: 'booking_confirmed',
        title: mode === 'private' ? 'Private cleaning request received' : 'Public cleaning request received',
        message: `${form.customer_name}, your ${mode} cleaning request has been submitted successfully.`,
      });

      toast.success(`${mode === 'private' ? 'Private' : 'Public'} cleaning request submitted successfully.`);
      setPrivateForm((prev) => ({ ...BASE_PRIVATE_FORM, ...prev, customer_name: prev.customer_name, phone: prev.phone, email: prev.email, address_line: prev.address_line, city: prev.city, state: prev.state, country: prev.country, postal_code: prev.postal_code }));
      setPublicForm((prev) => ({ ...BASE_PUBLIC_FORM, ...prev, customer_name: prev.customer_name, phone: prev.phone, email: prev.email, address_line: prev.address_line, city: prev.city, state: prev.state, country: prev.country, postal_code: prev.postal_code }));
    } catch (error) {
      console.error(error);
      toast.error('We could not submit your cleaning request. Please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  const summaryStats = useMemo(() => {
    return [
      { label: 'Address', value: privateForm.address_line || publicForm.address_line || 'Not set' },
      { label: 'Primary contact', value: privateForm.customer_name || publicForm.customer_name || 'Customer' },
      { label: 'Service plan', value: privateForm.billing_cycle || publicForm.billing_cycle },
    ];
  }, [privateForm, publicForm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 18, background: '#000000' }} strong>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clean" size={22} />
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Cleaning Service Request</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>Authenticated using your account details and saved address information.</p>
            </div>
          </div>
          <div className="badge badge-blue">{loading ? 'Syncing profile' : 'Ready'}</div>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Icon name="home" size={18} />
            <h3 style={{ fontSize: '1rem' }}>Private Property</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitBooking('private');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Customer Name</span>
                <input className="input" value={privateForm.customer_name} onChange={(e) => setPrivateForm({ ...privateForm, customer_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input className="input" value={privateForm.phone} onChange={(e) => setPrivateForm({ ...privateForm, phone: e.target.value })} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Email</span>
                <input className="input" type="email" value={privateForm.email} onChange={(e) => setPrivateForm({ ...privateForm, email: e.target.value })} />
              </label>
              <label className="field">
                <span>Home / Property Type</span>
                <select className="input" value={privateForm.property_type} onChange={(e) => setPrivateForm({ ...privateForm, property_type: e.target.value as PrivatePropertyForm['property_type'] })}>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="airbnb">Airbnb / Short-let</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Property Style</span>
                <input className="input" value={privateForm.home_style} onChange={(e) => setPrivateForm({ ...privateForm, home_style: e.target.value })} />
              </label>
              <label className="field">
                <span>Bedrooms</span>
                <input type="number" min={0} className="input" value={privateForm.bedrooms} onChange={(e) => setPrivateForm({ ...privateForm, bedrooms: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Kitchens</span>
                <input type="number" min={0} className="input" value={privateForm.kitchens} onChange={(e) => setPrivateForm({ ...privateForm, kitchens: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Toilets</span>
                <input type="number" min={0} className="input" value={privateForm.toilets} onChange={(e) => setPrivateForm({ ...privateForm, toilets: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Living Rooms</span>
                <input type="number" min={0} className="input" value={privateForm.living_rooms} onChange={(e) => setPrivateForm({ ...privateForm, living_rooms: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Service Plan</span>
                <select className="input" value={privateForm.billing_cycle} onChange={(e) => setPrivateForm({ ...privateForm, billing_cycle: e.target.value as PrivatePropertyForm['billing_cycle'] })}>
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="field">
                <span>Preferred Date</span>
                <input type="date" className="input" value={privateForm.booking_date} onChange={(e) => setPrivateForm({ ...privateForm, booking_date: e.target.value })} />
              </label>
              <label className="field">
                <span>Preferred Time</span>
                <input type="time" className="input" value={privateForm.booking_time} onChange={(e) => setPrivateForm({ ...privateForm, booking_time: e.target.value })} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Service Address</span>
                <input className="input" value={privateForm.address_line} onChange={(e) => setPrivateForm({ ...privateForm, address_line: e.target.value })} />
              </label>
              <label className="field">
                <span>City</span>
                <input className="input" value={privateForm.city} onChange={(e) => setPrivateForm({ ...privateForm, city: e.target.value })} />
              </label>
              <label className="field">
                <span>State</span>
                <input className="input" value={privateForm.state} onChange={(e) => setPrivateForm({ ...privateForm, state: e.target.value })} />
              </label>
              <label className="field">
                <span>Country</span>
                <input className="input" value={privateForm.country} onChange={(e) => setPrivateForm({ ...privateForm, country: e.target.value })} />
              </label>
              <label className="field">
                <span>Postal Code</span>
                <input className="input" value={privateForm.postal_code} onChange={(e) => setPrivateForm({ ...privateForm, postal_code: e.target.value })} />
              </label>

              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={privateForm.furniture_included} onChange={(e) => setPrivateForm({ ...privateForm, furniture_included: e.target.checked })} />
                Includes furniture and interior item care
              </label>
              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={privateForm.outdoor_cleaning} onChange={(e) => setPrivateForm({ ...privateForm, outdoor_cleaning: e.target.checked })} />
                Include outdoor cleaning and compound area cleaning
              </label>
              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={privateForm.indoor_cleaning} onChange={(e) => setPrivateForm({ ...privateForm, indoor_cleaning: e.target.checked })} />
                Include indoor cleaning and routine room maintenance
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Service Notes</span>
                <textarea className="input" rows={3} value={privateForm.notes} onChange={(e) => setPrivateForm({ ...privateForm, notes: e.target.value })} />
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || submitting === 'private'}>
              {submitting === 'private' ? <Spinner size={16} /> : 'Submit Private Request'}
            </button>
          </form>
        </GlassCard>

        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Icon name="building" size={18} />
            <h3 style={{ fontSize: '1rem' }}>Public Property</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitBooking('public');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Customer Name</span>
                <input className="input" value={publicForm.customer_name} onChange={(e) => setPublicForm({ ...publicForm, customer_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input className="input" value={publicForm.phone} onChange={(e) => setPublicForm({ ...publicForm, phone: e.target.value })} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Email</span>
                <input className="input" type="email" value={publicForm.email} onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })} />
              </label>
              <label className="field">
                <span>Building Category</span>
                <select className="input" value={publicForm.property_type} onChange={(e) => setPublicForm({ ...publicForm, property_type: e.target.value as PublicPropertyForm['property_type'] })}>
                  <option value="office">Corporate / Office</option>
                  <option value="other">Government / Individual / Other</option>
                </select>
              </label>
              <label className="field">
                <span>Property Category</span>
                <input className="input" value={publicForm.property_category} onChange={(e) => setPublicForm({ ...publicForm, property_category: e.target.value })} />
              </label>
              <label className="field">
                <span>Building / Estate Name</span>
                <input className="input" value={publicForm.building_name} onChange={(e) => setPublicForm({ ...publicForm, building_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Floors</span>
                <input type="number" min={0} className="input" value={publicForm.floors} onChange={(e) => setPublicForm({ ...publicForm, floors: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Rooms</span>
                <input type="number" min={0} className="input" value={publicForm.rooms} onChange={(e) => setPublicForm({ ...publicForm, rooms: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Kitchens</span>
                <input type="number" min={0} className="input" value={publicForm.kitchens} onChange={(e) => setPublicForm({ ...publicForm, kitchens: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Toilets</span>
                <input type="number" min={0} className="input" value={publicForm.toilets} onChange={(e) => setPublicForm({ ...publicForm, toilets: Number(e.target.value || 0) })} />
              </label>
              <label className="field">
                <span>Service Plan</span>
                <select className="input" value={publicForm.billing_cycle} onChange={(e) => setPublicForm({ ...publicForm, billing_cycle: e.target.value as PublicPropertyForm['billing_cycle'] })}>
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="field">
                <span>Preferred Date</span>
                <input type="date" className="input" value={publicForm.booking_date} onChange={(e) => setPublicForm({ ...publicForm, booking_date: e.target.value })} />
              </label>
              <label className="field">
                <span>Preferred Time</span>
                <input type="time" className="input" value={publicForm.booking_time} onChange={(e) => setPublicForm({ ...publicForm, booking_time: e.target.value })} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Service Address</span>
                <input className="input" value={publicForm.address_line} onChange={(e) => setPublicForm({ ...publicForm, address_line: e.target.value })} />
              </label>
              <label className="field">
                <span>City</span>
                <input className="input" value={publicForm.city} onChange={(e) => setPublicForm({ ...publicForm, city: e.target.value })} />
              </label>
              <label className="field">
                <span>State</span>
                <input className="input" value={publicForm.state} onChange={(e) => setPublicForm({ ...publicForm, state: e.target.value })} />
              </label>
              <label className="field">
                <span>Country</span>
                <input className="input" value={publicForm.country} onChange={(e) => setPublicForm({ ...publicForm, country: e.target.value })} />
              </label>
              <label className="field">
                <span>Postal Code</span>
                <input className="input" value={publicForm.postal_code} onChange={(e) => setPublicForm({ ...publicForm, postal_code: e.target.value })} />
              </label>

              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={publicForm.parking_area} onChange={(e) => setPublicForm({ ...publicForm, parking_area: e.target.checked })} />
                Includes parking area and exterior cleaning
              </label>
              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={publicForm.furniture_included} onChange={(e) => setPublicForm({ ...publicForm, furniture_included: e.target.checked })} />
                Includes furniture and office setup care
              </label>
              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={publicForm.outdoor_cleaning} onChange={(e) => setPublicForm({ ...publicForm, outdoor_cleaning: e.target.checked })} />
                Include outdoor and perimeter cleaning
              </label>
              <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={publicForm.indoor_cleaning} onChange={(e) => setPublicForm({ ...publicForm, indoor_cleaning: e.target.checked })} />
                Include indoor cleaning and shared workspace cleaning
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Additional Notes</span>
                <textarea className="input" rows={3} value={publicForm.notes} onChange={(e) => setPublicForm({ ...publicForm, notes: e.target.value })} />
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || submitting === 'public'}>
              {submitting === 'public' ? <Spinner size={16} /> : 'Submit Public Request'}
            </button>
          </form>
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 18, background: '#000000' }} strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {summaryStats.map((item) => (
            <div key={item.label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.71875rem', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontWeight: 600, fontSize: '0.84375rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

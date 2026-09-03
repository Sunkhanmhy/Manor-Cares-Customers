import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import Icon from '../../components/Icon';
import { getNormalizedAuthEmail, resolveEmailScopedIdentity } from '../../lib/emailScopedIdentity';

const defaultProfileForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  profile_picture_url: '',
  id_document_url: '',
  preferred_name: '',
  date_of_birth: '',
  gender: '',
  career_status: '',
  relationship_status: '',
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  preferred_contact_method: 'email',
  customer_status: 'active',
  property_type: 'house',
  bio: '',
  facebook_url: '',
  x_url: '',
  instagram_url: '',
  telegram_url: '',
  father_name: '',
  mother_name: '',
  parent_phone: '',
  parent_email: '',
  parent_address: '',
};

export function ProfilePage() {
  const { profile, customerProfile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(defaultProfileForm);

  const displayName = useMemo(() => {
    const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim();
    return fullName || user?.email?.split('@')[0] || 'Customer';
  }, [form.first_name, form.last_name, user?.email]);

  const fallbackAvatar = useMemo(() => {
    const g = (form.gender ?? '').toLowerCase();
    return g === 'female' ? '👩' : '👨';
  }, [form.gender]);

  useEffect(() => {
    if (!profile && !user) return;
    setForm({
      ...defaultProfileForm,
      email: user?.email ?? profile?.email ?? '',
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      profile_picture_url: profile?.profile_picture_url ?? profile?.avatar_url ?? '',
      id_document_url: profile?.id_document_url ?? '',
      preferred_name: profile?.preferred_name ?? '',
      date_of_birth: profile?.date_of_birth ?? '',
      gender: profile?.gender ?? '',
      career_status: profile?.career_status ?? '',
      relationship_status: profile?.relationship_status ?? '',
      address_line: profile?.address_line ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      country: profile?.country ?? '',
      postal_code: profile?.postal_code ?? '',
      preferred_contact_method: customerProfile?.preferred_contact_method ?? 'email',
      customer_status: customerProfile?.customer_status ?? 'active',
      property_type: customerProfile?.property_type ?? 'house',
      bio: profile?.bio ?? '',
      facebook_url: profile?.facebook_url ?? customerProfile?.facebook_url ?? '',
      x_url: profile?.x_url ?? customerProfile?.x_url ?? '',
      instagram_url: profile?.instagram_url ?? customerProfile?.instagram_url ?? '',
      telegram_url: profile?.telegram_url ?? customerProfile?.telegram_url ?? '',
      father_name: '',
      mother_name: '',
      parent_phone: '',
      parent_email: '',
      parent_address: '',
    });
  }, [profile, customerProfile, user]);

  useEffect(() => {
    const email = getNormalizedAuthEmail(user?.email, profile?.email);
    if (!email) return;

    let active = true;

    async function hydrateFromDatabase() {
      const identity = await resolveEmailScopedIdentity({
        email,
        fallbackProfileId: profile?.id ?? null,
        fallbackCustomerId: customerProfile?.id ?? null,
      });

      if (!identity.profileId) return;

      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', identity.profileId).maybeSingle();

      if (!active) return;

      if (!profileRow) return;

      const { data: customerRow } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('profile_id', identity.profileId)
        .maybeSingle();

      let parentInfo: Record<string, string> = {};
      if (customerRow?.notes) {
        try {
          const parsed = JSON.parse(customerRow.notes);
          parentInfo = parsed?.parents ?? {};
        } catch {
          parentInfo = {};
        }
      }

      if (!active) return;

      setForm((prev) => ({
        ...prev,
        email: profileRow.email ?? prev.email,
        first_name: profileRow.first_name ?? prev.first_name,
        last_name: profileRow.last_name ?? prev.last_name,
        phone: profileRow.phone ?? prev.phone,
        profile_picture_url: profileRow.profile_picture_url ?? profileRow.avatar_url ?? prev.profile_picture_url,
        id_document_url: profileRow.id_document_url ?? prev.id_document_url,
        preferred_name: profileRow.preferred_name ?? prev.preferred_name,
        date_of_birth: profileRow.date_of_birth ?? prev.date_of_birth,
        gender: profileRow.gender ?? prev.gender,
        career_status: profileRow.career_status ?? prev.career_status,
        relationship_status: profileRow.relationship_status ?? prev.relationship_status,
        address_line: profileRow.address_line ?? prev.address_line,
        city: profileRow.city ?? prev.city,
        state: profileRow.state ?? prev.state,
        country: profileRow.country ?? prev.country,
        postal_code: profileRow.postal_code ?? prev.postal_code,
        preferred_contact_method: customerRow?.preferred_contact_method ?? prev.preferred_contact_method,
        customer_status: customerRow?.customer_status ?? prev.customer_status,
        property_type: customerRow?.property_type ?? prev.property_type,
        bio: profileRow.bio ?? prev.bio,
        facebook_url: profileRow.facebook_url ?? customerRow?.facebook_url ?? prev.facebook_url,
        x_url: profileRow.x_url ?? customerRow?.x_url ?? prev.x_url,
        instagram_url: profileRow.instagram_url ?? customerRow?.instagram_url ?? prev.instagram_url,
        telegram_url: profileRow.telegram_url ?? customerRow?.telegram_url ?? prev.telegram_url,
        father_name: parentInfo.father_name ?? '',
        mother_name: parentInfo.mother_name ?? '',
        parent_phone: parentInfo.parent_phone ?? '',
        parent_email: parentInfo.parent_email ?? '',
        parent_address: parentInfo.parent_address ?? '',
      }));
    }

    void hydrateFromDatabase();

    return () => {
      active = false;
    };
  }, [customerProfile?.id, profile?.email, profile?.id, user?.email]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const profilePayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || user?.email || '',
        phone: form.phone.trim() || null,
        profile_picture_url: form.profile_picture_url || '/logo.jpg',
        id_document_url: form.id_document_url || null,
        preferred_name: form.preferred_name.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        career_status: form.career_status || null,
        relationship_status: form.relationship_status || null,
        address_line: form.address_line.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        postal_code: form.postal_code.trim() || null,
        bio: form.bio.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        x_url: form.x_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        telegram_url: form.telegram_url.trim() || null,
      };

      const lookupEmail = (user?.email ?? form.email).trim().toLowerCase();
      const identity = await resolveEmailScopedIdentity({
        email: lookupEmail,
        fallbackProfileId: profile?.id ?? null,
        fallbackCustomerId: customerProfile?.id ?? null,
      });

      let resolvedProfileId = identity.profileId;

      if (resolvedProfileId) {
        const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', resolvedProfileId);
        if (profileError) throw profileError;
      } else if (user) {
        const { data: createdProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            ...profilePayload,
            role: 'customer',
            status: 'active',
          })
          .select('id')
          .single();

        if (createProfileError || !createdProfile) throw createProfileError ?? new Error('Profile creation failed');
        resolvedProfileId = createdProfile.id;

        const { error: customerError } = await supabase.from('customer_profiles').insert({
          profile_id: resolvedProfileId,
          preferred_contact_method: form.preferred_contact_method,
          customer_status: form.customer_status,
          property_type: form.property_type,
        });

        if (customerError) throw customerError;
      }

      if (resolvedProfileId) {
        const notesPayload = JSON.stringify({
          bio: form.bio.trim() || null,
          parents: {
            father_name: form.father_name.trim(),
            mother_name: form.mother_name.trim(),
            parent_phone: form.parent_phone.trim(),
            parent_email: form.parent_email.trim(),
            parent_address: form.parent_address.trim(),
          },
        });

        const dataPayload = {
          preferred_contact_method: form.preferred_contact_method,
          customer_status: form.customer_status,
          property_type: form.property_type,
          facebook_url: form.facebook_url.trim() || null,
          x_url: form.x_url.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          telegram_url: form.telegram_url.trim() || null,
          notes: notesPayload,
        };

        if (customerProfile) {
          const targetCustomerId = identity.customerId ?? customerProfile.id;
          const { error: customerUpdateError } = await supabase.from('customer_profiles').update(dataPayload).eq('id', targetCustomerId);
          if (customerUpdateError) throw customerUpdateError;
        } else {
          const { data: createdCustomerProfile } = await supabase
            .from('customer_profiles')
            .insert({
              profile_id: resolvedProfileId,
              ...dataPayload,
            })
            .select('id')
            .single();

          if (!createdCustomerProfile) throw new Error('Customer profile creation failed');
        }
      }

      if (resolvedProfileId && (form.address_line || form.city || form.country)) {
        const { data: existingAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('profile_id', resolvedProfileId)
          .eq('address_type', 'home')
          .maybeSingle();

        const addressPayload = {
          profile_id: resolvedProfileId,
          address_type: 'home',
          address_line: form.address_line.trim() || profile?.address_line || 'N/A',
          city: form.city.trim() || profile?.city || 'N/A',
          state: form.state.trim() || profile?.state || null,
          country: form.country.trim() || profile?.country || 'NG',
          postal_code: form.postal_code.trim() || profile?.postal_code || null,
          is_default: true,
        };

        if (existingAddress) {
          await supabase.from('addresses').update(addressPayload).eq('id', existingAddress.id);
        } else {
          await supabase.from('addresses').insert(addressPayload);
        }
      }

      await refreshProfile();
      toast.success('Profile saved successfully.');
    } catch (err) {
      console.error(err);
      toast.error('We could not save your profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const fileName = `profile_${user.id}_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('id-docs').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('id-docs').getPublicUrl(data.path);
      setForm((prev) => ({ ...prev, profile_picture_url: urlData.publicUrl, id_document_url: urlData.publicUrl }));
      toast.success('Profile image uploaded. Save to sync to the database.');
    } catch {
      toast.error('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 18, background: '#000000' }} strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: 'linear-gradient(135deg, var(--clr-blue), var(--clr-green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--clr-white)',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            {form.profile_picture_url ? (
              <img
                src={form.profile_picture_url}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{fallbackAvatar}</span>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '4px 0 0' }}>{displayName}</h2>
            <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{form.email || user?.email || 'No email linked'}</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 24, background: '#000000' }} strong>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <GlassCard style={{ padding: 18, background: '#000000' }} strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon name="user" size={18} />
                  <h3 style={{ margin: 0, fontSize: '0.98rem' }}>Personal Details</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>Profile Picture</span>
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Preferred Name</span>
                    <input className="input" value={form.preferred_name} onChange={(e) => setForm({ ...form, preferred_name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>First Name</span>
                    <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Last Name</span>
                    <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>Email</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="support" size={18} />
                      <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required />
                    </div>
                  </label>
                  <label className="field">
                    <span>Phone Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="support" size={18} />
                      <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </label>
                  <label className="field">
                    <span>Date of Birth</span>
                    <input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Preferred Contact</span>
                    <select className="input" value={form.preferred_contact_method} onChange={(e) => setForm({ ...form, preferred_contact_method: e.target.value })}>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="sms">SMS</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Account Status</span>
                    <select className="input" value={form.customer_status} onChange={(e) => setForm({ ...form, customer_status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="vip">VIP</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>

                  <div style={{ gridColumn: '1 / -1', marginTop: 4, marginBottom: 2, fontWeight: 700, fontSize: '0.875rem', color: 'var(--clr-white)' }}>
                    Parents Information
                  </div>
                  <label className="field">
                    <span>Father's Name</span>
                    <input className="input" value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Mother's Name</span>
                    <input className="input" value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Parent Phone</span>
                    <input className="input" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Parent Email</span>
                    <input className="input" type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>Parent Address</span>
                    <input className="input" value={form.parent_address} onChange={(e) => setForm({ ...form, parent_address: e.target.value })} />
                  </label>
                </div>
              </GlassCard>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <GlassCard style={{ padding: 18 }} strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon name="settings" size={18} />
                  <h3 style={{ margin: 0, fontSize: '0.98rem' }}>More Information</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>ID Document</span>
                    <input
                      className="input"
                      type="url"
                      value={form.id_document_url}
                      onChange={(e) => setForm({ ...form, id_document_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="field">
                    <span>Career Status</span>
                    <select className="input" value={form.career_status} onChange={(e) => setForm({ ...form, career_status: e.target.value })}>
                      <option value="">Select</option>
                      <option value="employed">Employed</option>
                      <option value="self-employed">Self-employed</option>
                      <option value="student">Student</option>
                      <option value="unemployed">Unemployed</option>
                      <option value="retired">Retired</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Relationship Status</span>
                    <select className="input" value={form.relationship_status} onChange={(e) => setForm({ ...form, relationship_status: e.target.value })}>
                      <option value="">Prefer not to say</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Property Type</span>
                    <select className="input" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="office">Office</option>
                      <option value="airbnb">Airbnb / Short-let</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Address</span>
                    <input className="input" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>City</span>
                    <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>State</span>
                    <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Country</span>
                    <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Postal Code</span>
                    <input className="input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>Bio / Notes</span>
                    <textarea className="input" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </label>

                  <label className="field">
                    <span>Facebook</span>
                    <input className="input" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/" />
                  </label>
                  <label className="field">
                    <span>X / Twitter</span>
                    <input className="input" value={form.x_url} onChange={(e) => setForm({ ...form, x_url: e.target.value })} placeholder="https://x.com/" />
                  </label>
                  <label className="field">
                    <span>Instagram</span>
                    <input className="input" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/" />
                  </label>
                  <label className="field">
                    <span>Telegram</span>
                    <input className="input" value={form.telegram_url} onChange={(e) => setForm({ ...form, telegram_url: e.target.value })} placeholder="https://t.me/" />
                  </label>
                </div>
              </GlassCard>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...defaultProfileForm, email: user?.email ?? profile?.email ?? '' })}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? <Spinner size={16} /> : 'Save Profile'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

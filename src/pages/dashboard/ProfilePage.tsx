import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
        })
        .eq('id', profile!.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Your profile has been updated.');
    } catch {
      toast.error('We could not save your profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <GlassCard style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--clr-blue), var(--clr-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--clr-white)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div>
          <h2 style={{ fontSize: 19 }}>
            {profile.first_name} {profile.last_name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile.email}</p>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 18 }}>Personal Information</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>First Name</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Email (cannot be changed here)</label>
              <input className="input" value={profile.email} disabled />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input type="date" className="input" value={dateOfBirth ?? ''} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select className="input" value={gender ?? ''} onChange={(e) => setGender(e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Save Changes'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}

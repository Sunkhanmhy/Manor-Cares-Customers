import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import type { NotificationPreferences } from '../../types/database';

export function SettingsPage() {
  const { profile, customerProfile, refreshProfile } = useAuth();
  const toast = useToast();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [preferredContact, setPreferredContact] = useState('email');
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>(() => (localStorage.getItem('mc_theme') as 'auto' | 'dark' | 'light') ?? 'auto');
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>(() => (localStorage.getItem('mc_text_size') as 'small' | 'medium' | 'large') ?? 'medium');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profile || !customerProfile) return;
      const { data } = await supabase.from('notification_preferences').select('*').eq('profile_id', profile.id).maybeSingle();
      setPrefs(data as NotificationPreferences);
      setPreferredContact(customerProfile.preferred_contact_method);
      setLoading(false);
    }
    load();
  }, [profile, customerProfile]);

  async function handleSave() {
    if (!profile || !customerProfile || !prefs || saving) return;
    setSaving(true);
    try {
      const [prefsRes, custRes] = await Promise.all([
        supabase
          .from('notification_preferences')
          .update({
            email_notifications: prefs.email_notifications,
            sms_notifications: prefs.sms_notifications,
            marketing_notifications: prefs.marketing_notifications,
          })
          .eq('profile_id', profile.id),
        supabase.from('customer_profiles').update({ preferred_contact_method: preferredContact }).eq('id', customerProfile.id),
      ]);
      if (prefsRes.error || custRes.error) throw prefsRes.error ?? custRes.error;
      await refreshProfile();
      // persist personalization locally
      localStorage.setItem('mc_theme', theme);
      localStorage.setItem('mc_text_size', textSize);
      applyPersonalization();
      toast.success('Settings saved.');
    } catch {
      toast.error('We could not save your settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function applyPersonalization() {
    // theme
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // text size
    const size = textSize === 'small' ? '14px' : textSize === 'large' ? '17px' : '15px';
    document.documentElement.style.setProperty('--global-font-size', size);
  }

  if (loading || !prefs) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
      <GlassCard style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Personalization</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ minWidth: 110, color: 'var(--text-muted)' }}>Theme</label>
          <select className="input" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
            <option value="auto">Auto</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ minWidth: 110, color: 'var(--text-muted)' }}>Text Size</label>
          <select className="input" value={textSize} onChange={(e) => setTextSize(e.target.value as any)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </GlassCard>
      <GlassCard style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Notification Preferences</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prefs.email_notifications}
              onChange={(e) => setPrefs({ ...prefs, email_notifications: e.target.checked })}
            />
            Email notifications
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prefs.sms_notifications}
              onChange={(e) => setPrefs({ ...prefs, sms_notifications: e.target.checked })}
            />
            SMS notifications
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prefs.marketing_notifications}
              onChange={(e) => setPrefs({ ...prefs, marketing_notifications: e.target.checked })}
            />
            Marketing communications
          </label>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Preferred Contact Method</h3>
        <select className="input" value={preferredContact} onChange={(e) => setPreferredContact(e.target.value)}>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="sms">SMS</option>
        </select>
      </GlassCard>

      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleSave} disabled={saving}>
        {saving ? <Spinner size={16} /> : 'Save Settings'}
      </button>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth, mapAuthError } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import { PasswordStrengthMeter, evaluatePasswordStrength } from '../../components/PasswordStrengthMeter';

export function PasswordSecurityPage() {
  const { user, updatePassword } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (evaluatePasswordStrength(newPassword).score < 2) {
      setError('Choose a stronger new password (min. 8 characters, mix of letters & numbers).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate with the current password before allowing a change.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (reauthError) {
        setError('Your current password is incorrect.');
        return;
      }

      await updatePassword(newPassword);
      toast.success('Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err) : 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard style={{ padding: 26, maxWidth: 480 }}>
      <h3 style={{ fontSize: 16, marginBottom: 18 }}>Change Password</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <div className="field">
          <label>Current Password</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label>New Password</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>
        <div className="field">
          <label>Confirm New Password</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>
          {saving ? <Spinner size={16} /> : 'Update Password'}
        </button>
      </form>
    </GlassCard>
  );
}

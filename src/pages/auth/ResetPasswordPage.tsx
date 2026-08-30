import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth, mapAuthError } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import { PasswordStrengthMeter, evaluatePasswordStrength } from '../../components/PasswordStrengthMeter';

export function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL and establishes a session automatically.
    supabase.auth.getSession().then(({ data }) => {
      setValidLink(!!data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setValidLink(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (evaluatePasswordStrength(password).score < 2) {
      setError('Please choose a stronger password (min. 8 characters, mix of letters & numbers).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err) : 'Could not update your password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnToSignIn() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-shell" style={{ justifyContent: 'center' }}>
      <div className="auth-col">
        <GlassCard strong style={{ padding: 'clamp(24px, 4vw, 40px)', width: '100%', maxWidth: 440 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Reset Your Password</h2>

          {!ready ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
              <Spinner size={28} />
            </div>
          ) : success ? (
            <div className="glass" style={{ padding: 16, borderLeft: '3px solid var(--clr-green)', marginTop: 12 }}>
              <p style={{ fontSize: 13.5, marginBottom: 12 }}>
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <button className="btn btn-primary btn-block" onClick={handleReturnToSignIn}>
                Return to Sign In
              </button>
            </div>
          ) : !validLink ? (
            <div className="glass" style={{ padding: 16, borderLeft: '3px solid #e57373', marginTop: 12 }}>
              <p style={{ fontSize: 13.5, marginBottom: 12 }}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn btn-primary btn-block">
                Request New Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }} noValidate>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <PasswordStrengthMeter password={password} />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && <p className="error-text" role="alert">{error}</p>}

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Update Password'}
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

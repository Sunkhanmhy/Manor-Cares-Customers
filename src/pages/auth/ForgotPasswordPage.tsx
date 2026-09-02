import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send recovery email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell" style={{ justifyContent: 'center' }}>
      <div className="auth-col">
        <GlassCard strong style={{ padding: 'clamp(24px, 4vw, 40px)', width: '100%', maxWidth: 440 }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Forgot Password?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem', marginBottom: 24 }}>
            Enter your account email and we&apos;ll send you a secure link to reset your password.
          </p>

          {sent ? (
            <div className="glass" style={{ padding: 16, borderLeft: '3px solid var(--clr-green)' }}>
              <p style={{ fontSize: '0.84375rem', marginBottom: 12 }}>
                If an account exists for <strong>{email}</strong>, a recovery link has been sent. Please check your inbox.
              </p>
              <Link to="/" className="btn btn-ghost btn-block">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
              <div className="field">
                <label htmlFor="forgot-email">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error && <p className="error-text" role="alert">{error}</p>}

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Send Recovery Link'}
              </button>

              <Link to="/" style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Return to Sign In
              </Link>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

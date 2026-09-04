import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setRememberMe } from '../../lib/supabaseClient';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';

export function SignInForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      setRememberMe(remember);
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard strong style={{ padding: 'clamp(24px, 4vw, 40px)', width: '100%' }}>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginBottom: 18,
        }}
      >
        <img
          src="/logo.jpg"
          alt="Manor-Cares"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <h2 style={{ fontSize: '1.625rem', marginBottom: 8 }}>Welcome Back</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem', marginBottom: 24 }}>
        Sign in to manage your cleaning services, bookings, payments and account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <div className="field">
          <label htmlFor="signin-email">Email address</label>
          <input
            id="signin-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="signin-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="checkbox-row" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </label>
          <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--clr-white)' }}>
            Forgot Password?
          </Link>
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button type="submit" className="btn btn-success btn-block" disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Don&apos;t have an account?{' '}
        <a href="#create-account" style={{ color: 'var(--clr-white)', fontWeight: 600 }}>
          Create Account
        </a>
      </p>
    </GlassCard>
  );
}

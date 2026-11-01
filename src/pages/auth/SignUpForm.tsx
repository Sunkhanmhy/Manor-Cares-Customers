import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';

interface SignUpFormProps {
  onSwitchToSignIn?: () => void;
}

const oauthOptions = [
  {
    label: 'Continue With Google',
    provider: 'google' as const,
    brand: '#ffffff',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.92h5.45c-.29 1.62-1.88 4.73-5.45 4.73-3.26 0-5.92-2.69-5.92-6.01S8.74 6.83 12 6.83c1.86 0 3.11.79 3.82 1.47l2.59-2.5C16.43 4.96 14.53 4.2 12 4.2A9.6 9.6 0 0 0 2.4 12a9.6 9.6 0 0 0 9.6 9.6c5.54 0 9.2-3.88 9.2-9.36 0-.62-.05-1.08-.13-1.55H12Z" />
        <path fill="#34A853" d="M3.86 7.59l3.33 2.44A6.08 6.08 0 0 1 12 5.92c1.86 0 3.11.79 3.82 1.47l2.59-2.5A9.38 9.38 0 0 0 12 2.4A9.6 9.6 0 0 0 3.86 7.59Z" />
        <path fill="#FBBC05" d="M12 21.6c2.25 0 4.16-.74 5.54-2.03l-2.55-2.1a5.91 5.91 0 0 1-3.01 1.04c-2.85 0-5.05-1.9-5.88-4.47L.92 8.2A9.6 9.6 0 0 0 12 21.6Z" />
        <path fill="#4285F4" d="M3.86 7.59A9.4 9.4 0 0 0 2.4 12c0 1.54.36 3.01.99 4.31l3.38-2.63A6.08 6.08 0 0 1 5.92 12c0-.47.05-.93.12-1.38L3.86 7.59Z" />
      </svg>
    ),
  },
  {
    label: 'Continue With Apple',
    provider: 'apple' as const,
    brand: '#111111',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path fill="currentColor" d="M15.8 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.9-3.5 2.1-1.5 2.7-.4 6.7 1.1 8.9.8 1.1 1.6 2.2 2.8 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.7-2.2.8-1.2 1.2-2.5 1.2-2.6-.1-.1-2.3-.9-3.3-2.7ZM14.4 6.4c.6-.7 1-1.8.9-2.8-.9.1-2.1.6-2.8 1.4-.6.7-1.1 1.8-.9 2.8.9.1 2-.5 2.8-1.4Z" />
      </svg>
    ),
  },
  {
    label: 'Continue With Facebook',
    provider: 'facebook' as const,
    brand: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path fill="currentColor" d="M13.5 21v-8h2.7l.5-3h-3.2V7.3c0-.9.2-1.6 1.5-1.6H17V2.9c-.4-.1-1.8-.2-3.3-.2-3.2 0-5.4 1.9-5.4 5.5V10H6v3h2.3v8h5.2Z" />
      </svg>
    ),
  },
  {
    label: 'Continue With Instagram',
    provider: 'linkedin' as const,
    brand: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path fill="currentColor" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.96 3.96 0 0 0 3.8 7.75v8.5A3.96 3.96 0 0 0 7.75 20.2h8.5a3.96 3.96 0 0 0 3.95-3.95v-8.5a3.96 3.96 0 0 0-3.95-3.95h-8.5Zm8.96 1.53a1.12 1.12 0 1 1 0 2.24 1.12 1.12 0 0 1 0-2.24ZM12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5Zm0 1.8A3.7 3.7 0 1 0 15.7 12 3.7 3.7 0 0 0 12 8.3Z" />
      </svg>
    ),
  },
];

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const { signInWithOAuth } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  async function handleOAuth(provider: 'google' | 'apple' | 'facebook' | 'linkedin') {
    setOauthError(null);
    setIsAuthenticating(provider);

    try {
      await signInWithOAuth(provider);
    } catch (error) {
      setOauthError(error instanceof Error ? error.message : 'Unable to continue with this provider right now.');
    } finally {
      setIsAuthenticating(null);
    }
  }

  return (
    <GlassCard
      strong
      id="create-account"
      style={{
        padding: 'clamp(20px, 3vw, 32px)',
        width: '100%',
        maxWidth: '100%',
        background: '#000000',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Create Account</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem', margin: '0 0 18px' }}>
        Join Havelle Agency to book professional cleaning services in minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {oauthOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            className="btn btn-block"
            onClick={() => handleOAuth(option.provider)}
            disabled={isAuthenticating !== null}
            style={{
              justifyContent: 'center',
              background: option.provider === 'google' ? '#ffffff' : option.brand,
              color: option.provider === 'google' ? '#111111' : '#ffffff',
              border: option.provider === 'google' ? '1px solid rgba(17,17,17,0.12)' : 'none',
              borderRadius: 28,
              boxShadow: option.provider === 'google' ? 'none' : '0 8px 18px rgba(0,0,0,0.16)',
              padding: '12px 16px',
              minHeight: 46,
              opacity: isAuthenticating === option.provider ? 0.8 : 1,
              gap: 10,
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <span
              style={{
                width: option.provider === 'google' ? 32 : 24,
                height: option.provider === 'google' ? 32 : 24,
                minWidth: option.provider === 'google' ? 32 : 24,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: option.provider === 'google' ? '#ffffff' : option.brand,
                color: '#fff',
                lineHeight: 1,
                flexShrink: 0,
                border: option.provider === 'google' ? '1px solid rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {option.icon}
            </span>
            <span style={{ textAlign: 'center' }}>{option.label}</span>
          </button>
        ))}
      </div>

      {oauthError && (
        <p className="error-text" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          {oauthError}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '18px 0 12px',
          color: 'var(--text-muted)',
          fontSize: '0.74rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        <span>or</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          style={{ color: 'var(--clr-white)', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          Sign In
        </button>
      </p>
    </GlassCard>
  );
}

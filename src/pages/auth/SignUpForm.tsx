import { GlassCard } from '../../components/GlassCard';

interface SignUpFormProps {
  onSwitchToSignIn?: () => void;
}

const oauthOptions = [
  { label: 'Continue With Google', icon: 'G', brand: '#4285F4' },
  { label: 'Continue With Apple', icon: '', brand: '#111111' },
  { label: 'Continue With Facebook', icon: 'f', brand: '#1877F2' },
  { label: 'Continue With LinkedIn', icon: 'in', brand: '#0A66C2' },
];

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  return (
    <GlassCard
      strong
      id="create-account"
      style={{
        padding: 'clamp(20px, 3vw, 32px)',
        width: 'min(100%, 440px)',
        maxWidth: '100%',
        background: 'linear-gradient(145deg, rgba(18, 163, 117, 0.24), rgba(10, 107, 77, 0.2))',
        border: '1px solid rgba(18, 163, 117, 0.45)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Create Account</h2>
        <img
          src="/logo.jpg"
          alt="Havelle Agency"
          style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
        />
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
            style={{
              justifyContent: 'flex-start',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--clr-white)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'none',
              padding: '12px 16px',
              minHeight: 46,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                minWidth: 24,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: option.brand,
                color: '#fff',
                fontSize: option.label.includes('LinkedIn') ? '0.72rem' : '0.9rem',
                fontWeight: 800,
                fontFamily: 'Arial, sans-serif',
                marginRight: 12,
                lineHeight: 1,
              }}
            >
              {option.icon}
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>{option.label}</span>
          </button>
        ))}
      </div>

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

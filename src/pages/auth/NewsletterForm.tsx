import { useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import { subscribeToNewsletter } from '../../lib/newsletter';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await subscribeToNewsletter(email.trim());
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard style={{ padding: 'clamp(20px, 3vw, 28px)', width: '100%' }}>
      <h3 style={{ fontSize: 17, marginBottom: 6 }}>Stay in the loop</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Subscribe for cleaning tips, offers and Manor-Cares news — no spam, unsubscribe anytime.
      </p>

      {success ? (
        <p style={{ fontSize: 13.5, color: 'var(--clr-green)' }}>
          You&apos;re subscribed! Check your inbox for a confirmation.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} noValidate>
          <input
            type="email"
            className="input"
            style={{ flex: '1 1 200px' }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
            {loading ? <Spinner size={16} /> : 'Subscribe'}
          </button>
        </form>
      )}

      {error && (
        <p className="error-text" style={{ marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </GlassCard>
  );
}

import { GlassCard } from '../../components/GlassCard';

const SOCIAL_LINKS = [
  { name: 'Facebook', href: 'https://facebook.com/manorcares', label: 'FB' },
  { name: 'Instagram', href: 'https://instagram.com/manorcares', label: 'IG' },
  { name: 'Twitter', href: 'https://twitter.com/manorcares', label: 'X' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/manorcares', label: 'in' },
  { name: 'YouTube', href: 'https://youtube.com/@manorcares', label: 'YT' },
];

export function SocialLinks() {
  return (
    <GlassCard style={{ padding: 'clamp(20px, 3vw, 28px)', width: '100%' }}>
      <h3 style={{ fontSize: '1.0625rem', marginBottom: 6 }}>Social Platforms</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
        Follow Manor-Cares for updates, offers and behind-the-scenes moments.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {SOCIAL_LINKS.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit Manor-Cares on ${s.name}`}
            title={s.name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--glass-border)',
              color: 'var(--clr-white)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textDecoration: 'none',
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
    </GlassCard>
  );
}

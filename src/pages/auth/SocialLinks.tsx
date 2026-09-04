import { GlassCard } from '../../components/GlassCard';

const SOCIAL_LINKS = [
  {
    name: 'Facebook',
    href: 'https://facebook.com/manorcares',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-7h2.3l.4-3h-2.7V9.1c0-.9.3-1.6 1.7-1.6h1V4.8c-.2 0-.9-.1-1.9-.1-2.7 0-4.1 1.4-4.1 4.2V11H8v3h2.2v7h3.3z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/manorcares',
    color: '#E4405F',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3zm0 1.8A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8zm8.9 1.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 1.8A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3z" />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/manorcares',
    color: '#111827',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.8L6.2 21H3.4l6.5-7.5L3 3h5.7l4 6.2L18.2 3zm-1 16.2h1.6L8 4.7H6.3l10.9 14.5z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/company/manorcares',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M6.4 8.9H3.5V20h2.9V8.9zM5 7.6a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM20.5 13.6c0-3.3-1.8-4.8-4.2-4.8-1.9 0-2.7 1-3.2 1.8V8.9h-2.9V20h2.9v-5.5c0-1.5.3-3 2.1-3 1.7 0 1.7 1.6 1.7 3.1V20h2.9v-6.4z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/@manorcares',
    color: '#FF0000',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M21.8 8.2a3 3 0 0 0-2.1-2.1C17.8 5.6 12 5.6 12 5.6s-5.8 0-7.7.5a3 3 0 0 0-2.1 2.1c-.5 1.9-.5 3.8-.5 3.8s0 1.9.5 3.8a3 3 0 0 0 2.1 2.1c1.9.5 7.7.5 7.7.5s5.8 0 7.7-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-3.8.5-3.8s0-1.9-.5-3.8zM10.1 15.2V8.8l5.5 3.2-5.5 3.2z" />
      </svg>
    ),
  },
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
              border: `1px solid ${s.color}66`,
              color: s.color,
              fontWeight: 700,
              fontSize: '0.8125rem',
              textDecoration: 'none',
              boxShadow: `0 0 14px ${s.color}22`,
            }}
          >
            {s.icon}
          </a>
        ))}
      </div>
    </GlassCard>
  );
}

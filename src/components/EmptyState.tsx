import type { ReactNode } from 'react';

export function EmptyState({
  icon = '📭',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 8,
        padding: '48px 20px',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ fontSize: 40 }}>{icon}</div>
      <h3 style={{ fontSize: 17 }}>{title}</h3>
      {message && <p style={{ maxWidth: 380, fontSize: 13.5 }}>{message}</p>}
      {action}
    </div>
  );
}

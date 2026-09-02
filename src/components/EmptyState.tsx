import type { ReactNode } from 'react';

import Icon from './Icon';

export function EmptyState({
  icon = <Icon name="default" />,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
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
      <div className="icon empty-icon" style={{ fontSize: '2.5rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.0625rem' }}>{title}</h3>
      {message && <p style={{ maxWidth: 380, fontSize: '0.84375rem' }}>{message}</p>}
      {action}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const initials = profile ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase() : '';

  return (
    <header className="glass topbar">
      <button
        className="btn btn-ghost hamburger-btn"
        onClick={onMenuClick}
        aria-label="Toggle navigation menu"
        style={{ padding: '8px 12px' }}
      >
        ☰
      </button>
      <h1 style={{ fontSize: '1.125rem' }}>{title}</h1>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard/notifications')}
          aria-label={`Notifications, ${unreadCount} unread`}
          style={{ position: 'relative', padding: '9px 12px' }}
        >
          <span className="icon">🔔</span>
          {unreadCount > 0 && (
            <span
              className="badge badge-red"
              style={{ position: 'absolute', top: -6, right: -6, padding: '1px 6px', fontSize: '0.65625rem' }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--clr-blue), var(--clr-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--clr-white)',
          }}
        >
          {initials || '🙂'}
        </div>
      </div>
    </header>
  );
}

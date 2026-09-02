import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Icon from './Icon';

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
        <Icon name="menu" size={20} />
      </button>
      <h1 style={{ fontSize: '1.125rem' }}>{title}</h1>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard/notifications')}
          aria-label={`Notifications, ${unreadCount} unread`}
          style={{ position: 'relative', padding: '9px 12px' }}
        >
          <Icon name="notifications" size={20} />
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
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {profile?.profile_picture_url || profile?.avatar_url ? (
            <img
              src={profile?.profile_picture_url || profile?.avatar_url || '/logo.jpg'}
              alt="User profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : initials || (
            <img src="/logo.jpg" alt="Logo fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      </div>
    </header>
  );
}

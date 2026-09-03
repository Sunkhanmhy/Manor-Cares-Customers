import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';
import Icon from './Icon';

export function Topbar({
  title,
  onMenuClick,
  theme,
  onToggleTheme,
}: {
  title: string;
  onMenuClick: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

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
        <button
          className={`theme-toggle-3d ${theme === 'light' ? 'is-light' : 'is-dark'}`}
          onClick={onToggleTheme}
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-knob">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

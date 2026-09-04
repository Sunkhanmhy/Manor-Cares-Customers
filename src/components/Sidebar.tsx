import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Icon from './Icon';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', color: '#22d3ee', end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: 'user', color: '#f59e0b' },
  { to: '/dashboard/addresses', label: 'My Addresses', icon: 'location', color: '#fb7185' },
  { to: '/dashboard/book', label: 'Book a Cleaning', icon: 'clean', color: '#34d399' },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: 'calendar', color: '#a78bfa' },
  { to: '/dashboard/payments', label: 'Payments', icon: 'payments', color: '#2dd4bf' },
  { to: '/dashboard/invoices', label: 'Invoices', icon: 'invoice', color: '#60a5fa' },
  { to: '/dashboard/support', label: 'Support', icon: 'support', color: '#f97316' },
  { to: '/dashboard/notifications', label: 'Notifications', icon: 'notifications', color: '#facc15' },
  { to: '/dashboard/security', label: 'Password & Security', icon: 'security', color: '#10b981' },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, signOut, refreshProfile } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(4,10,20,0.55)', zIndex: 40 }}
          className="sidebar-backdrop"
        />
      )}
      <aside className={`glass-strong sidebar ${open ? 'sidebar-open' : ''}`}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.jpg"
            alt="Manor-Cares logo"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
          <div>
            <div className="sidebar-brand-name" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Manor-Cares</div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>Customer Portal</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', overflowY: 'auto', flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              onClick={async () => {
                try {
                  // ensure profile/customerProfile are refreshed before the page mounts
                  await refreshProfile?.();
                } catch {
                  // ignore — navigation should proceed even if refresh fails
                }
                onClose();
              }}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${item.color}22`,
                  border: `1px solid ${item.color}66`,
                  boxShadow: `0 0 16px ${item.color}33`,
                }}
              >
                <Icon name={item.icon as string} size={20} color={item.color} vector />
              </span>
              <span>{item.label}</span>
              {item.to === '/dashboard/notifications' && unreadCount > 0 && (
                <span className="badge badge-red" style={{ marginLeft: 'auto', padding: '2px 8px' }}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            {profile?.first_name} {profile?.last_name}
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => signOut()}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="logout" size={18} color="#f87171" vector /> Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Icon from './Icon';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: 'user' },
  { to: '/dashboard/addresses', label: 'My Addresses', icon: 'location' },
  { to: '/dashboard/book', label: 'Book a Cleaning', icon: 'clean' },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: 'calendar' },
  { to: '/dashboard/payments', label: 'Payments', icon: 'payments' },
  { to: '/dashboard/invoices', label: 'Invoices', icon: 'invoice' },
  { to: '/dashboard/support', label: 'Support', icon: 'support' },
  { to: '/dashboard/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
  { to: '/dashboard/security', label: 'Password & Security', icon: 'security' },
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
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--clr-white)' }}>Manor-Cares</div>
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
              <span aria-hidden="true"><Icon name={item.icon as string} size={20} /></span>
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
              <Icon name="logout" size={18} /> Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: '👤' },
  { to: '/dashboard/addresses', label: 'My Addresses', icon: '📍' },
  { to: '/dashboard/book', label: 'Book a Cleaning', icon: '🧽' },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: '📅' },
  { to: '/dashboard/payments', label: 'Payments', icon: '💳' },
  { to: '/dashboard/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/dashboard/support', label: 'Support', icon: '🎧' },
  { to: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  { to: '/dashboard/security', label: 'Password & Security', icon: '🔒' },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, signOut } = useAuth();
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
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--clr-blue), var(--clr-green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: 'var(--clr-white)',
            }}
          >
            MC
          </div>
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
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span aria-hidden="true" className="icon">{item.icon}</span>
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
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  );
}

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/profile': 'My Profile',
  '/dashboard/addresses': 'My Addresses',
  '/dashboard/book': 'Book a Cleaning',
  '/dashboard/bookings': 'My Bookings',
  '/dashboard/payments': 'Payments',
  '/dashboard/invoices': 'Invoices',
  '/dashboard/support': 'Support Center',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/security': 'Password & Security',
};

export function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Dashboard';

  return (
    <div className="dashboard-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="dashboard-main">
        <Topbar title={title} onMenuClick={() => setMenuOpen((v) => !v)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

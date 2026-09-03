import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { logPublicMetric, metricsEnabled } from '../../lib/publicMetrics';

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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const persisted = window.localStorage.getItem('mc_dashboard_theme');
    return persisted === 'light' ? 'light' : 'dark';
  });
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Dashboard';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('mc_dashboard_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!metricsEnabled) return;

    void logPublicMetric('usage', 1, { route: pathname, source: 'dashboard' });

    if (pathname === '/dashboard/book') {
      void logPublicMetric('booking_requested', 1, { route: pathname });
    }

    if (pathname === '/dashboard/bookings') {
      void logPublicMetric('booking_executed', 1, { route: pathname });
    }
  }, [pathname]);

  return (
    <div className="dashboard-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="dashboard-main">
        <Topbar
          title={title}
          onMenuClick={() => setMenuOpen((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

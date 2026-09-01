import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ToastProvider } from './lib/toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/auth/AuthPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { AddressesPage } from './pages/dashboard/AddressesPage';
import { BookCleaningPage } from './pages/dashboard/BookCleaningPage';
import { BookingsPage } from './pages/dashboard/BookingsPage';
import { PaymentsPage } from './pages/dashboard/PaymentsPage';
import { InvoicesPage } from './pages/dashboard/InvoicesPage';
import { SupportPage } from './pages/dashboard/SupportPage';
import { NotificationsPage } from './pages/dashboard/NotificationsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { PasswordSecurityPage } from './pages/dashboard/PasswordSecurityPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="addresses" element={<AddressesPage />} />
                  <Route path="book" element={<BookCleaningPage />} />
                  <Route path="bookings" element={<BookingsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="security" element={<PasswordSecurityPage />} />
                </Route>
              </Route>
            </Routes>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;


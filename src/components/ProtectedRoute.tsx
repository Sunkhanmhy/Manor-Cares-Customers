import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './Spinner';

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Checking your session…" />;
  if (!session) return <Navigate to="/" replace />;

  return <Outlet />;
}

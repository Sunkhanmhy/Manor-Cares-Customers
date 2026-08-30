import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../../components/Spinner';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { NewsletterForm } from './NewsletterForm';
import { SocialLinks } from './SocialLinks';

export function AuthPage() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Loading Manor-Cares…" />;
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-shell">
      <div className="auth-col auth-col-left">
        <div className="auth-col-stack">
          <SignInForm />
          <NewsletterForm />
          <SocialLinks />
        </div>
      </div>
      <div className="auth-col auth-col-right">
        <SignUpForm />
      </div>
    </div>
  );
}

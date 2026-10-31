import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../../components/Spinner';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { NewsletterForm } from './NewsletterForm';
import { SocialLinks } from './SocialLinks';

export function AuthPage() {
  const { session, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  if (loading) return <FullPageSpinner label="Loading Havelle Agency…" />;
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-shell">
      <div className="auth-col auth-col-left">
        <div className="auth-col-stack auth-form-panel auth-form-shell">
          <div className="auth-tabs" role="tablist" aria-label="Authentication tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => setActiveTab('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {activeTab === 'signin' ? (
            <>
              <SignInForm onSwitchToSignUp={() => setActiveTab('signup')} />
              <NewsletterForm />
              <SocialLinks />
            </>
          ) : (
            <SignUpForm onSwitchToSignIn={() => setActiveTab('signin')} />
          )}
        </div>
      </div>
    </div>
  );
}

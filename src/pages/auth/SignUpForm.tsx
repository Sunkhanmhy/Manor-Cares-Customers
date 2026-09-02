import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import { PasswordStrengthMeter, evaluatePasswordStrength } from '../../components/PasswordStrengthMeter';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  addressLine: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  acceptPrivacy: false,
};

export function SignUpForm() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!form.phone.trim()) next.phone = 'Phone number is required.';
    if (!form.addressLine.trim()) next.addressLine = 'Address is required.';
    if (!form.city.trim()) next.city = 'City is required.';
    if (!form.country.trim()) next.country = 'Country is required.';
    if (evaluatePasswordStrength(form.password).score < 2) next.password = 'Choose a stronger password (min. 8 characters, mix of letters & numbers).';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    if (!form.acceptTerms) next.acceptTerms = 'You must accept the Terms & Conditions.';
    if (!form.acceptPrivacy) next.acceptPrivacy = 'You must accept the Privacy Policy.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postalCode: form.postalCode.trim(),
      });

      if (needsEmailConfirmation) {
        setSuccessMessage('Account created! Please check your email to confirm your address before signing in.');
        setForm(INITIAL_STATE);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'We could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard strong id="create-account" style={{ padding: 'clamp(24px, 4vw, 40px)', width: '100%' }}>
      <h2 style={{ fontSize: '1.625rem', marginBottom: 8 }}>Create Account</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem', marginBottom: 22 }}>
        Join Manor-Cares to book professional cleaning services in minutes.
      </p>

      {successMessage && (
        <div className="glass" style={{ padding: 14, marginBottom: 18, borderLeft: '3px solid var(--clr-green)' }}>
          <p style={{ fontSize: '0.84375rem' }}>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--clr-white)', marginBottom: 10 }}>
            Personal Information
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name</label>
              <input
                className={`input ${errors.firstName ? 'input-error' : ''}`}
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
              />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>
            <div className="field">
              <label>Last Name</label>
              <input
                className={`input ${errors.lastName ? 'input-error' : ''}`}
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
              />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input
                type="tel"
                className={`input ${errors.phone ? 'input-error' : ''}`}
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
            <div className="field">
              <label>Date of Birth (optional)</label>
              <input
                type="date"
                className="input"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Gender (optional)</label>
              <select className="input" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--clr-white)', marginBottom: 10 }}>
            Address Information
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input
                className={`input ${errors.addressLine ? 'input-error' : ''}`}
                value={form.addressLine}
                onChange={(e) => update('addressLine', e.target.value)}
              />
              {errors.addressLine && <span className="error-text">{errors.addressLine}</span>}
            </div>
            <div className="field">
              <label>City</label>
              <input
                className={`input ${errors.city ? 'input-error' : ''}`}
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
              {errors.city && <span className="error-text">{errors.city}</span>}
            </div>
            <div className="field">
              <label>State</label>
              <input className="input" value={form.state} onChange={(e) => update('state', e.target.value)} />
            </div>
            <div className="field">
              <label>Country</label>
              <input
                className={`input ${errors.country ? 'input-error' : ''}`}
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
              {errors.country && <span className="error-text">{errors.country}</span>}
            </div>
            <div className="field">
              <label>Postal Code</label>
              <input className="input" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--clr-white)', marginBottom: 10 }}>
            Account Information
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <PasswordStrengthMeter password={form.password} />
          </div>
        </fieldset>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.acceptTerms} onChange={(e) => update('acceptTerms', e.target.checked)} />
            I accept the Terms &amp; Conditions
          </label>
          {errors.acceptTerms && <span className="error-text">{errors.acceptTerms}</span>}
          <label className="checkbox-row">
            <input type="checkbox" checked={form.acceptPrivacy} onChange={(e) => update('acceptPrivacy', e.target.checked)} />
            I accept the Privacy Policy
          </label>
          {errors.acceptPrivacy && <span className="error-text">{errors.acceptPrivacy}</span>}
        </div>

        {formError && <p className="error-text" role="alert">{formError}</p>}

        <button type="submit" className="btn btn-success btn-block" disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Create Account'}
        </button>
      </form>
    </GlassCard>
  );
}

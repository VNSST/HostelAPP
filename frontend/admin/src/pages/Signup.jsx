import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE from '../api';

export default function Signup() {
  const [step, setStep] = useState(1); // 1=email verify, 2=registration form
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [formData, setFormData] = useState({
    name: '', city: '', locality: '', hostel_unique_username: '', phone: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOTP = async () => {
    setError('');
    if (!email || !email.includes('@')) return setError('Enter a valid email address');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otp || otp.length !== 6) return setError('Enter the 6-digit OTP');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerificationToken(data.verificationToken);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (val) => {
    // Only allow digits, max 10
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: cleaned }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.phone.length !== 10) return setError('Phone number must be exactly 10 digits');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');
    if (!/^[a-z0-9_]+$/.test(formData.hostel_unique_username)) {
      return setError('Hostel username must be lowercase with only letters, numbers, and underscores');
    }

    setLoading(true);
    try {
      const { confirmPassword, ...fields } = formData;
      const payload = { ...fields, email, emailVerificationToken: verificationToken };
      const res = await fetch(`${API_BASE}/auth/register_owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card signup-card page-transition">
        <div style={{textAlign: 'center', marginBottom: '1.75rem'}}>
          <div style={{width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem'}}>🏠</div>
          <h1 style={{color: 'var(--primary)', margin: 0, fontSize: '1.5rem'}}>Create Your Account</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem'}}>Register your hostel on Mana PG Rent</p>
        </div>

        {/* Step indicator */}
        <div className="otp-steps">
          <div className={`otp-step ${step >= 1 ? 'active' : ''}`}>
            <span className="otp-step-num">{step > 1 ? '✓' : '1'}</span>
            <span>Verify Email</span>
          </div>
          <div className="otp-step-line"></div>
          <div className={`otp-step ${step >= 2 ? 'active' : ''}`}>
            <span className="otp-step-num">2</span>
            <span>Details</span>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 1 && (
          <div>
            <div className="form-group">
              <label htmlFor="owner-email">Email Address</label>
              <input
                id="owner-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoFocus
              />
            </div>

            {!otpSent ? (
              <button className="button" style={{width: '100%'}} onClick={handleSendOTP} disabled={otpLoading}>
                {otpLoading ? 'Sending...' : '📧 Send Verification Code'}
              </button>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="owner-otp">Enter 6-digit OTP</label>
                  <input
                    id="owner-otp" type="text" maxLength="6"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    style={{textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.5rem', fontWeight: 600}}
                    autoFocus
                  />
                  <span className="form-hint" style={{textAlign: 'center'}}>
                    Check your inbox (or backend console in dev mode)
                  </span>
                </div>
                <button className="button" style={{width: '100%'}} onClick={handleVerifyOTP} disabled={otpLoading}>
                  {otpLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <p style={{textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                  {countdown > 0
                    ? `Resend in ${countdown}s`
                    : <button onClick={handleSendOTP} disabled={otpLoading} style={{background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600, padding: 0}}>Resend Code</button>
                  }
                </p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSignup}>
            <div className="otp-verified-badge">
              <span>✓</span> Email verified: {email}
            </div>

            <div className="form-group">
              <label htmlFor="owner-name">Full Name</label>
              <input id="owner-name" type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} required placeholder="e.g. Rajesh Kumar" autoFocus />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="owner-city">City</label>
                <input id="owner-city" type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} required placeholder="e.g. Bangalore" />
              </div>
              <div className="form-group">
                <label htmlFor="owner-locality">Locality</label>
                <input id="owner-locality" type="text" value={formData.locality} onChange={e => handleChange('locality', e.target.value)} required placeholder="e.g. Koramangala" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="owner-hostel-username">Hostel Unique Username</label>
              <input id="owner-hostel-username" type="text" value={formData.hostel_unique_username} onChange={e => handleChange('hostel_unique_username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required placeholder="e.g. sunrise_pg_blr" />
              <span className="form-hint">Tenants will use this to join your hostel. Only lowercase letters, numbers, and underscores.</span>
            </div>

            <div className="form-group">
              <label htmlFor="owner-phone">Phone Number</label>
              <div style={{position: 'relative'}}>
                <span style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500}}>+91</span>
                <input id="owner-phone" type="tel" inputMode="numeric" value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)} required
                  placeholder="9876543210" maxLength="10"
                  style={{paddingLeft: '48px'}}
                />
              </div>
              {formData.phone && formData.phone.length !== 10 && (
                <span className="form-hint" style={{color: '#EF4444'}}>Must be exactly 10 digits ({formData.phone.length}/10)</span>
              )}
              {formData.phone && formData.phone.length === 10 && (
                <span className="form-hint" style={{color: '#10B981'}}>✓ Valid phone number</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="owner-password">Password</label>
                <input id="owner-password" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} required placeholder="Min 6 characters" />
              </div>
              <div className="form-group">
                <label htmlFor="owner-confirm-password">Confirm Password</label>
                <input id="owner-confirm-password" type="password" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} required placeholder="Re-enter password" />
              </div>
            </div>

            <button id="admin-signup-btn" type="submit" className="button" style={{width: '100%', marginTop: '1rem', padding: '0.75rem'}} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="auth-toggle">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

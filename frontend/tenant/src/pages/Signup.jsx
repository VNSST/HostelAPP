import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE from '../api';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [formData, setFormData] = useState({
    hostel_unique_username: '', name: '', phone: '', room_number: '', password: '', confirmPassword: ''
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
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: cleaned }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.phone.length !== 10) return setError('Phone number must be exactly 10 digits');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      const { confirmPassword, ...fields } = formData;
      const payload = { ...fields, email, emailVerificationToken: verificationToken };
      const res = await fetch(`${API_BASE}/auth/register_tenant`, {
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', margin: 0 }}>
        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
          <div style={{width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem'}}>🏠</div>
          <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>Create Account</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.85rem'}}>Register to manage your rent payments</p>
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

        {error && <div style={{background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.85rem'}}>{error}</div>}

        {step === 1 && (
          <div>
            <div className="form-group">
              <label htmlFor="tenant-email">Email Address</label>
              <input
                id="tenant-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoFocus
              />
            </div>

            {!otpSent ? (
              <button className="button" style={{marginTop: '0.25rem'}} onClick={handleSendOTP} disabled={otpLoading}>
                {otpLoading ? 'Sending...' : '📧 Send Verification Code'}
              </button>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="tenant-otp">Enter 6-digit OTP</label>
                  <input
                    id="tenant-otp" type="text" maxLength="6"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    style={{textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.5rem', fontWeight: 600}}
                    autoFocus
                  />
                  <span style={{display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'center'}}>
                    Check your inbox (or backend console in dev mode)
                  </span>
                </div>
                <button className="button" onClick={handleVerifyOTP} disabled={otpLoading}>
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
              <label htmlFor="tenant-hostel-username">Hostel Username</label>
              <input id="tenant-hostel-username" type="text" value={formData.hostel_unique_username} onChange={e => handleChange('hostel_unique_username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required placeholder="e.g. sunrise_pg_blr" autoFocus />
              <span style={{display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem'}}>Ask your hostel owner for this username</span>
            </div>

            <div className="form-group">
              <label htmlFor="tenant-name">Full Name</label>
              <input id="tenant-name" type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} required placeholder="e.g. Amit Sharma" />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-phone">Phone Number</label>
              <div style={{position: 'relative'}}>
                <span style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500}}>+91</span>
                <input id="tenant-phone" type="tel" inputMode="numeric" value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)} required
                  placeholder="9876543210" maxLength="10"
                  style={{paddingLeft: '48px'}}
                />
              </div>
              {formData.phone && formData.phone.length !== 10 && (
                <span style={{display: 'block', fontSize: '0.7rem', color: '#EF4444', marginTop: '0.3rem'}}>Must be exactly 10 digits ({formData.phone.length}/10)</span>
              )}
              {formData.phone && formData.phone.length === 10 && (
                <span style={{display: 'block', fontSize: '0.7rem', color: '#10B981', marginTop: '0.3rem'}}>✓ Valid phone number</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="tenant-room">Room Number</label>
              <input id="tenant-room" type="text" value={formData.room_number} onChange={e => handleChange('room_number', e.target.value)} placeholder="e.g. A-101 (optional)" />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-password">Password</label>
              <input id="tenant-password" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} required placeholder="Min 6 characters" />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-confirm-password">Confirm Password</label>
              <input id="tenant-confirm-password" type="password" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} required placeholder="Re-enter password" />
            </div>

            <button id="tenant-signup-btn" type="submit" className="button" style={{marginTop: '0.5rem'}} disabled={loading}>
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

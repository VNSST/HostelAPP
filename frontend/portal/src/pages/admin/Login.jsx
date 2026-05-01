import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API_BASE from '../../api';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      if (data.role !== 'OWNER') throw new Error('Access denied. Owner account required.');
      
      localStorage.setItem('token', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card page-transition">
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem'}}>🏠</div>
          <h1 style={{color: 'var(--primary)', margin: 0}}>Admin Portal</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem'}}>Mana PG Rent Verification System</p>
        </div>

        {justRegistered && <div className="auth-success">Account created successfully! Please sign in.</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="admin-identifier">Email or Phone</label>
            <input id="admin-identifier" type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="Enter your email or phone" />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          <button id="admin-login-btn" type="submit" className="button" style={{width: '100%', marginTop: '1rem', padding: '0.75rem'}} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-toggle">
          Don't have an account? <Link to="/admin/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

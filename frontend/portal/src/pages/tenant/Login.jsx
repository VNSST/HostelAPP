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
      
      if (data.role !== 'TENANT') throw new Error('Access denied. Tenant account required.');
      
      localStorage.setItem('tenant_token', data.token);
      navigate('/tenant/pay');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', margin: 0 }}>
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem'}}>🏠</div>
          <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>Tenant Portal</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.85rem'}}>Sign in to manage your rent payments</p>
        </div>

        {justRegistered && <div style={{background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.85rem'}}>Account created successfully! Please sign in.</div>}
        {error && <div style={{background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.85rem'}}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="tenant-identifier">Email or Phone</label>
            <input id="tenant-identifier" type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="Enter your email or phone" />
          </div>
          <div className="form-group">
            <label htmlFor="tenant-password">Password</label>
            <input id="tenant-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          <button id="tenant-login-btn" type="submit" className="button" style={{marginTop: '0.5rem'}} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-toggle">
          Don't have an account? <Link to="/tenant/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

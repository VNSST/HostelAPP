import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApiFetch, tenantApiPostForm } from '../../api';

const TenantProfileDropdown = ({ tenant }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{position: 'relative'}} ref={ref}>
      <button
        id="tenant-profile-btn"
        onClick={() => setOpen(!open)}
        style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.2s'
        }}
      >
        {getInitials(tenant.name)}
      </button>
      {open && (
        <div className="tenant-profile-dropdown">
          <div style={{textAlign: 'center', padding: '1.25rem 1rem 0.75rem'}}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.15rem', margin: '0 auto 0.6rem'
            }}>
              {getInitials(tenant.name)}
            </div>
            <h3 style={{fontSize: '1rem', margin: 0, color: 'var(--text-main)'}}>{tenant.name}</h3>
            <span style={{
              display: 'inline-block', marginTop: '0.35rem', padding: '0.15rem 0.55rem',
              borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.04em', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)'
            }}>Tenant</span>
          </div>
          <div style={{padding: '0.5rem 1rem 0.75rem'}}>
            <div className="tenant-profile-field">
              <span>Hostel ID</span>
              <span style={{color: 'var(--primary)', fontWeight: 600, background: 'rgba(139,92,246,0.12)', padding: '0.1rem 0.45rem', borderRadius: '5px', fontSize: '0.7rem'}}>
                @{tenant.hostel_unique_username}
              </span>
            </div>
            <div className="tenant-profile-field">
              <span>Room</span>
              <span>{tenant.room_number || '—'}</span>
            </div>
            <div className="tenant-profile-field">
              <span>Email</span>
              <span>{tenant.email}</span>
            </div>
            <div className="tenant-profile-field">
              <span>Phone</span>
              <span>{tenant.phone}</span>
            </div>
          </div>
          <div style={{padding: '0.5rem 1rem 1rem', borderTop: '1px solid var(--border-color)'}}>
            <button
              className="button"
              style={{width: '100%', fontSize: '0.85rem', padding: '0.7rem', background: 'rgba(239,68,68,0.15)', color: '#EF4444'}}
              onClick={() => { localStorage.removeItem('tenant_token'); window.location.href='/login'; }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PaymentSubmit() {
  const [tenant, setTenant] = useState(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('UPI');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const tData = await tenantApiFetch('/tenant/me');
      setTenant(tData);
      setAmount(tData.prorated ? tData.prorated_amount : tData.monthly_rent);

      const hData = await tenantApiFetch('/tenant/payments');
      setHistory(hData);
    } catch (err) {
      // Token expired or invalid
      localStorage.removeItem('tenant_token');
      navigate('/tenant/login');
    } finally {
      setPageLoading(false);
    }
  };

  const handleLeaveHostel = async () => {
    if (!window.confirm('Are you sure you want to leave the hostel? This will remove your account and all payment history.')) return;
    try {
      setLoading(true);
      await tenantApiFetch('/tenant/me', { method: 'DELETE' });
      localStorage.removeItem('tenant_token');
      navigate('/tenant/login');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const fd = new FormData();
    fd.append('amount', amount);
    fd.append('payment_mode', mode);
    if (mode === 'UPI') {
      if (file) fd.append('screenshot', file);
    }

    try {
      const data = await tenantApiPostForm('/payments', fd);
      let msg = 'Payment submitted successfully!';
      if (data.warning) msg += ` ⚠️ ${data.warning}`;
      setSuccess(msg);
      setFile(null);
      // Refresh history
      const hData = await tenantApiFetch('/tenant/payments');
      setHistory(hData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <p style={{color: 'var(--text-muted)'}}>Loading...</p>
      </div>
    );
  }

  if (!tenant) return null;

  const getStatusColor = (status) => {
    if (status === 'VERIFIED') return '#10B981';
    if (status === 'REJECTED') return '#EF4444';
    return '#F59E0B';
  };

  return (
    <>
      {/* Header */}
      <div className="header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h2 style={{margin: 0, fontSize: '1.35rem'}}>Hi, {tenant.name.split(' ')[0]} 👋</h2>
            <p style={{margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem'}}>
              {tenant.room_number ? `Room ${tenant.room_number}` : 'No room assigned'}
            </p>
          </div>
          <TenantProfileDropdown tenant={tenant} />
        </div>
      </div>

      {/* Rent Info Card */}
      <div className="card">
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Expected Rent</p>
        <p style={{fontSize: '2.25rem', fontWeight: '700', color: 'var(--primary)', margin: '0 0 0.25rem'}}>₹{Number(tenant.prorated ? tenant.prorated_amount : (tenant.monthly_rent || 0)).toLocaleString('en-IN')}</p>
        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0}}>Due on the {tenant.rent_due_day}<sup>th</sup> of every month</p>
        {tenant.prorated && (
          <div style={{marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(139,92,246,0.15)', borderRadius: '8px', fontSize: '0.8rem', color: '#C4B5FD'}}>
            <strong>First Month Prorated:</strong> You joined on the {tenant.joining_day}<sup>th</sup>. You are being charged for {tenant.days_charged} out of {tenant.days_in_month} days this month. Regular rent is ₹{Number(tenant.monthly_rent).toLocaleString('en-IN')}.
          </div>
        )}
      </div>

      {/* Payment Form */}
      <div className="card">
        <h3 style={{marginBottom: '1.25rem', fontSize: '1.1rem'}}>Submit Payment</h3>

        {success && <div style={{background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem'}}>{success}</div>}
        {error && <div style={{background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pay-amount">Amount (₹)</label>
            <input id="pay-amount" type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="pay-mode">Payment Mode</label>
            <select id="pay-mode" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
          
          {mode === 'UPI' && (
            <>
              <div className="form-group">
                <label htmlFor="pay-screenshot">Screenshot Proof</label>
                <input id="pay-screenshot" type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
              </div>
            </>
          )}

          <button id="submit-payment-btn" type="submit" className="button" disabled={loading} style={{marginTop: '0.5rem'}}>
            {loading ? 'Submitting...' : 'Submit Payment Proof'}
          </button>
        </form>
      </div>

      {/* Payment History */}
      <div className="card" style={{marginBottom: '3rem'}}>
        <h3 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>Payment History</h3>
        {history.length === 0 ? (
          <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>No payments submitted yet.</p>
        ) : (
          history.slice(0, 10).map((h, idx) => (
            <div key={h.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.85rem 0',
              borderBottom: idx < Math.min(history.length, 10) - 1 ? '1px solid var(--border-color)' : 'none'
            }}>
              <div>
                <p style={{fontWeight: '600', margin: '0 0 0.15rem', fontSize: '0.95rem'}}>₹{Number(h.amount).toLocaleString('en-IN')}</p>
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0}}>
                  {h.payment_mode} · {new Date(h.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="badge" style={{
                color: getStatusColor(h.status),
                borderColor: getStatusColor(h.status),
                border: `1px solid ${getStatusColor(h.status)}`
              }}>
                {h.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Leave Hostel */}
      <div style={{textAlign: 'center', marginBottom: '2rem'}}>
        <button className="button" style={{background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', fontSize: '0.85rem', padding: '0.6rem 1.2rem', display: 'inline-block'}} onClick={handleLeaveHostel} disabled={loading}>
          Leave Hostel (Remove Account)
        </button>
      </div>
    </>
  );
}

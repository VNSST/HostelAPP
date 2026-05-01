import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api';

export default function CashApprovals() {
  const [cashPending, setCashPending] = useState([]);
  const [upiPending, setUpiPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPayments = async () => {
    try {
      const data = await apiFetch('/dashboard/payments');
      setCashPending(data.CASH_PENDING || []);
      setUpiPending(data.UPI_PENDING || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      await apiFetch(`/payments/${id}/${action}`, { method: 'POST' });
      fetchPayments();
    } catch (err) {
      alert('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Payment Approvals</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Review and approve pending cash and UPI payments</p>

      {/* Cash Pending Section */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>💵 Cash Payments ({cashPending.length})</h2>
      <div className="grid-cards" style={{ marginBottom: '2.5rem' }}>
        {cashPending.map(p => (
          <div className="card" key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{p.tenant_name}</h3>
              <span className="badge pending">CASH</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Room {p.room_number}</p>
            <div className="stat-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>₹{Number(p.amount).toLocaleString('en-IN')}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Submitted: {new Date(p.payment_date).toLocaleDateString('en-IN')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="button success" style={{ flex: 1, fontSize: '0.85rem' }} disabled={actionLoading === p.id} onClick={() => handleAction(p.id, 'confirm')}>
                {actionLoading === p.id ? '...' : '✓ Confirm'}
              </button>
              <button className="button danger" style={{ flex: 1, fontSize: '0.85rem' }} disabled={actionLoading === p.id} onClick={() => handleAction(p.id, 'reject')}>
                {actionLoading === p.id ? '...' : '✕ Reject'}
              </button>
            </div>
          </div>
        ))}
        {cashPending.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No pending cash payments.</p>
        )}
      </div>

      {/* UPI Pending Section */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📱 UPI Payments ({upiPending.length})</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Room</th>
              <th>Amount</th>
              <th>Screenshot</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {upiPending.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: '500' }}>{p.tenant_name}</td>
                <td>{p.room_number}</td>
                <td>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                <td>{p.screenshot_url ? <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>View</a> : '—'}</td>
                <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="button success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} disabled={actionLoading === p.id} onClick={() => handleAction(p.id, 'confirm')}>
                      {actionLoading === p.id ? '...' : '✓'}
                    </button>
                    <button className="button danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} disabled={actionLoading === p.id} onClick={() => handleAction(p.id, 'reject')}>
                      {actionLoading === p.id ? '...' : '✕'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {upiPending.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No pending UPI payments.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

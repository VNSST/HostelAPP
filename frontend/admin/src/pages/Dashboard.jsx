import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sumData = await apiFetch('/dashboard/summary');
        setSummary(sumData);

        const payData = await apiFetch('/dashboard/payments');
        setPayments(payData.VERIFIED || []);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return <div style={{padding: '2rem', color: 'var(--danger)'}}>Error: {error}</div>;
  }

  return (
    <div>
      <h1 style={{marginBottom: '0.5rem'}}>Dashboard</h1>
      <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Overview of rent collection for this month</p>
      
      {summary && (
        <div className="grid-cards">
          <div className="card" id="stat-tenants">
            <div className="stat-label">Active Tenants</div>
            <div className="stat-value">{summary.total_tenants}</div>
          </div>
          <div className="card" id="stat-collected">
            <div className="stat-label">Collected This Month</div>
            <div className="stat-value" style={{color: 'var(--success)'}}>₹{Number(summary.total_collected_amount).toLocaleString('en-IN')}</div>
          </div>
          <div className="card" id="stat-verified">
            <div className="stat-label">Verified Payments</div>
            <div className="stat-value">{summary.total_paid}</div>
          </div>
          <div className="card" id="stat-pending">
            <div className="stat-label">Pending Verifications</div>
            <div className="stat-value" style={{color: 'var(--warning)'}}>{summary.total_pending}</div>
          </div>
        </div>
      )}

      <h2 style={{marginBottom: '1rem'}}>Recent Verified Payments</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Tenant</th>
              <th>Room</th>
              <th>Amount</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                <td>{p.tenant_name}</td>
                <td>{p.room_number}</td>
                <td style={{fontWeight: '600'}}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${p.payment_mode === 'CASH' ? 'pending' : 'verified'}`}>{p.payment_mode}</span></td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No verified payments found for this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState('');

  const fetchTenants = async () => {
    try {
      const data = await apiFetch('/tenants');
      setTenants(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>Tenants</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.25rem'}}>{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="badge verified" style={{fontSize: '0.75rem', padding: '0.4rem 0.85rem'}}>
          Self-Registration Enabled
        </div>
      </div>

      {error && <div style={{color: 'var(--danger)', marginBottom: '1rem'}}>Error: {error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Room</th>
              <th>Monthly Rent</th>
              <th>Due Day</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id}>
                <td style={{fontWeight: '500'}}>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.room_number || '—'}</td>
                <td>{t.monthly_rent ? `₹${Number(t.monthly_rent).toLocaleString('en-IN')}` : '—'}</td>
                <td>{t.rent_due_day ? <>{t.rent_due_day}<sup>th</sup></> : '—'}</td>
                <td><span className={`badge ${t.status === 'active' ? 'verified' : 'rejected'}`}>{t.status}</span></td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan="7" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No tenants have registered yet. Share your hostel username with tenants so they can sign up.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

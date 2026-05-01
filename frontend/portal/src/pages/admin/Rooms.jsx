import React, { useState, useEffect } from 'react';
import { apiFetch, apiPost } from '../../api';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [roomNumber, setRoomNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchRooms = async () => {
    try {
      const data = await apiFetch('/rooms');
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomNumber || !rentAmount) return;
    setAdding(true);
    setError('');
    try {
      await apiPost('/rooms', { room_number: roomNumber, rent_amount: rentAmount });
      setRoomNumber('');
      setRentAmount('');
      fetchRooms();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await apiFetch(`/rooms/${id}`, { method: 'DELETE' });
      fetchRooms();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading rooms...</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>Rooms Management</h1>
          <p style={{color: 'var(--text-muted)', marginTop: '0.25rem'}}>{rooms.length} room{rooms.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {error && <div style={{color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', background: '#FEE2E2', borderRadius: '8px'}}>{error}</div>}

      <div className="card" style={{marginBottom: '2rem'}}>
        <h3 style={{marginBottom: '1rem'}}>Add New Room</h3>
        <form onSubmit={handleAddRoom} style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div className="form-group" style={{marginBottom: 0, flex: 1}}>
            <label htmlFor="room-number">Room Name/Number</label>
            <input id="room-number" type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required placeholder="e.g. 101 or A-1" />
          </div>
          <div className="form-group" style={{marginBottom: 0, flex: 1}}>
            <label htmlFor="rent-amount">Monthly Rent (₹)</label>
            <input id="rent-amount" type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required placeholder="e.g. 5000" min="1" />
          </div>
          <button type="submit" className="button" disabled={adding} style={{padding: '0.65rem 1.5rem'}}>
            {adding ? 'Adding...' : 'Add Room'}
          </button>
        </form>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Monthly Rent</th>
              <th>Active Tenants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r.id}>
                <td style={{fontWeight: '500'}}>{r.room_number}</td>
                <td style={{fontWeight: '600'}}>₹{Number(r.rent_amount).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`badge ${parseInt(r.tenant_count) > 0 ? 'verified' : 'pending'}`}>
                    {r.tenant_count} Tenant{parseInt(r.tenant_count) !== 1 ? 's' : ''}
                  </span>
                </td>
                <td>
                  <button className="button outline danger" style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem'}} onClick={() => handleDeleteRoom(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr><td colSpan="4" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No rooms added yet. Add rooms to allow tenants to join.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Reconcile from './pages/Reconcile';
import CashApprovals from './pages/CashApprovals';
import { apiFetch } from './api';

const ProfileDropdown = () => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    apiFetch('/profile/owner').then(setProfile).catch(() => {});
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
    <div className="profile-wrapper" ref={ref}>
      <button className="profile-trigger" onClick={() => setOpen(!open)} id="admin-profile-btn">
        <div className="profile-avatar">{profile ? getInitials(profile.name) : '...'}</div>
        <div className="profile-trigger-info">
          <span className="profile-trigger-name">{profile?.name || 'Loading...'}</span>
          <span className="profile-trigger-role">Owner</span>
        </div>
      </button>
      {open && profile && (
        <div className="profile-dropdown page-transition">
          <div className="profile-dropdown-header">
            <div className="profile-avatar-lg">{getInitials(profile.name)}</div>
            <h3>{profile.name}</h3>
            <p className="profile-role-badge">Hostel Owner</p>
          </div>
          <div className="profile-dropdown-body">
            <div className="profile-field">
              <span className="profile-field-label">Hostel ID</span>
              <span className="profile-field-value profile-hostel-id">@{profile.hostel_unique_username}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-value">{profile.email}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Phone</span>
              <span className="profile-field-value">{profile.phone}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Location</span>
              <span className="profile-field-value">{profile.locality}, {profile.city}</span>
            </div>
          </div>
          <div className="profile-dropdown-footer">
            <button className="button outline" style={{width: '100%', fontSize: '0.8rem'}} onClick={() => { localStorage.clear(); window.location.href='/login'; }}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return (
    <div className="layout">
      <div className="sidebar">
        <h2>PG Admin</h2>
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
        <NavLink to="/tenants" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Tenants</NavLink>
        <NavLink to="/cash-approvals" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Cash Approvals</NavLink>
        <NavLink to="/reconcile" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Bank Reconcile</NavLink>
        <div style={{flex: 1}}></div>
        <ProfileDropdown />
      </div>
      <div className="main-content">
        <div className="page-transition">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
        <Route path="/cash-approvals" element={<ProtectedRoute><CashApprovals /></ProtectedRoute>} />
        <Route path="/reconcile" element={<ProtectedRoute><Reconcile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

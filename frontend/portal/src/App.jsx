import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from './api';

// ─── Portal Selector ─────────────────────────────────────────────────────────
function PortalSelector() {
  return (
    <div className="portal-root">
      <div className="portal-inner page-transition">
        <div className="portal-logo">🏠</div>
        <h1 className="portal-title">Mana PG Rent</h1>
        <p className="portal-subtitle">Rent Verification System — Select your portal to continue</p>

        <div className="portal-cards">
          <Link to="/tenant/login" className="portal-card tenant-card" id="portal-tenant-btn">
            <div className="portal-card-icon">👤</div>
            <div className="portal-card-title">tenant</div>
            <div className="portal-card-desc">Submit rent payments and track your payment history</div>
            <div className="portal-card-arrow">→</div>
          </Link>

          <Link to="/admin/login" className="portal-card owner-card" id="portal-owner-btn">
            <div className="portal-card-icon">🔑</div>
            <div className="portal-card-title">PG Admin</div>
            <div className="portal-card-desc">Manage tenants, verify payments, and reconcile accounts</div>
            <div className="portal-card-arrow">→</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Profile Dropdown ──────────────────────────────────────────────────
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
            <div className="profile-field"><span className="profile-field-label">Hostel ID</span><span className="profile-field-value profile-hostel-id">@{profile.hostel_unique_username}</span></div>
            <div className="profile-field"><span className="profile-field-label">Email</span><span className="profile-field-value">{profile.email}</span></div>
            <div className="profile-field"><span className="profile-field-label">Phone</span><span className="profile-field-value">{profile.phone}</span></div>
            <div className="profile-field"><span className="profile-field-label">Location</span><span className="profile-field-value">{profile.locality}, {profile.city}</span></div>
          </div>
          <div className="profile-dropdown-footer">
            <button className="button outline" style={{width: '100%', fontSize: '0.8rem'}} onClick={() => { localStorage.removeItem('token'); window.location.href='/'; }}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin: Protected Layout ──────────────────────────────────────────────────
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/admin/login" />;
  return (
    <div className="layout">
      <div className="sidebar">
        <h2>PG Admin</h2>
        <NavLink to="/admin/dashboard" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
        <NavLink to="/admin/rooms"     className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Rooms</NavLink>
        <NavLink to="/admin/tenants"   className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Tenants</NavLink>
        <NavLink to="/admin/cash-approvals" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Cash Approvals</NavLink>
        <div style={{flex: 1}}></div>
        <ProfileDropdown />
      </div>
      <div className="main-content">
        <div className="page-transition">{children}</div>
      </div>
    </div>
  );
};

// ─── Tenant: Protected Layout ─────────────────────────────────────────────────
const TenantProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('tenant_token');
  if (!token) return <Navigate to="/tenant/login" />;
  return <div className="tenant-theme"><div className="mobile-container">{children}</div></div>;
};

// ─── Lazy-load page components ────────────────────────────────────────────────
import AdminLogin       from './pages/admin/Login';
import AdminSignup      from './pages/admin/Signup';
import Dashboard        from './pages/admin/Dashboard';
import Rooms            from './pages/admin/Rooms';
import Tenants          from './pages/admin/Tenants';
import CashApprovals    from './pages/admin/CashApprovals';
import TenantLogin      from './pages/tenant/Login';
import TenantSignup     from './pages/tenant/Signup';
import PaymentSubmit    from './pages/tenant/PaymentSubmit';

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal selector */}
        <Route path="/" element={<PortalSelector />} />

        {/* Admin routes */}
        <Route path="/admin/login"   element={<AdminLogin />} />
        <Route path="/admin/signup"  element={<AdminSignup />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />
        <Route path="/admin/rooms"     element={<AdminProtectedRoute><Rooms /></AdminProtectedRoute>} />
        <Route path="/admin/tenants"   element={<AdminProtectedRoute><Tenants /></AdminProtectedRoute>} />
        <Route path="/admin/cash-approvals" element={<AdminProtectedRoute><CashApprovals /></AdminProtectedRoute>} />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />

        {/* Tenant routes */}
        <Route path="/tenant/login"  element={<div className="tenant-theme"><div className="mobile-container"><TenantLogin /></div></div>} />
        <Route path="/tenant/signup" element={<div className="tenant-theme"><div className="mobile-container"><TenantSignup /></div></div>} />
        <Route path="/tenant/pay"    element={<TenantProtectedRoute><PaymentSubmit /></TenantProtectedRoute>} />
        <Route path="/tenant/*"      element={<Navigate to="/tenant/pay" />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

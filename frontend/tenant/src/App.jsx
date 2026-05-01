import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PaymentSubmit from './pages/PaymentSubmit';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('tenant_token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="mobile-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pay" element={<ProtectedRoute><PaymentSubmit /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/pay" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

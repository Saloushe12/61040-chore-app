import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Home from './pages/Home';
import VenueDetail from './pages/VenueDetail';
import UserProfile from './pages/UserProfile';
import VenueDashboard from './pages/VenueDashboard';
import Alerts from './pages/Alerts';
import Heatmap from './pages/Heatmap';
import AlertNotification from './components/alerts/AlertNotification';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

// Navigation Bar Component
const NavBar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="nav-brand">
          <a href="/">WaitLess</a>
        </div>
        <div className="nav-links">
          <a href="/" className="nav-link">Home</a>
          <a href="/profile" className="nav-link">Profile</a>
          <a href="/alerts" className="nav-link">Alerts</a>
          <a href="/heatmap" className="nav-link">Heatmap</a>
          {user.role === 'venue_operator' && (
            <a href="/dashboard" className="nav-link">Dashboard</a>
          )}
        </div>
        <div className="nav-user">
          <span className="user-name">{user.displayName || user.email}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <NavBar />
      <AlertNotification />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/venue/:id"
          element={
            <ProtectedRoute>
              <VenueDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <VenueDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heatmap"
          element={
            <ProtectedRoute>
              <Heatmap />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;

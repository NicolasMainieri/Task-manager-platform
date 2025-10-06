import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Componente per proteggere le rotte
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('🛡️ ProtectedRoute - Auth status:', { isAuthenticated, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
};

// Componente per reindirizzare se già autenticato (solo per login)
const LoginRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('🌐 LoginRoute - Auth status:', { isAuthenticated, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('✅ Already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing Page - Pubblica, accessibile a tutti */}
          <Route path="/" element={<Landing />} />
          
          {/* Login - Reindirizza a dashboard se già autenticato */}
          <Route 
            path="/login" 
            element={
              <LoginRoute>
                <Login />
              </LoginRoute>
            } 
          />
          
          {/* Dashboard - Protetta, richiede autenticazione */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all: reindirizza alla landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
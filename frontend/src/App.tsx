import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing.tsx';  // ✅ Senza .jsx
import Login from './pages/Login.tsx';      // ✅ Senza .jsx
import DashboardRouter from './pages/DashboardRouter';  // ✅ Senza .tsx
import SuperAdminPage from './pages/SuperAdminPage';
import LegalPage from './pages/LegalPage';
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

            {/* Dashboard - Protetta, usa il router intelligente */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            {/* SuperAdmin - Protetta, solo per SuperAdmin */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute>
                  <SuperAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Legal - Protetta, per studi legali */}
            <Route
              path="/legal"
              element={
                <ProtectedRoute>
                  <LegalPage />
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
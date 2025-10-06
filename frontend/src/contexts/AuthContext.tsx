import React, { createContext, useState, useContext, useEffect } from 'react';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Controlla se c'è un token salvato all'avvio
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('🔍 Checking saved auth:', { savedToken: !!savedToken, savedUser: !!savedUser });
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('✅ User restored from localStorage:', parsedUser);
      } catch (error) {
        console.error('❌ Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User, authToken: string) => {
    console.log('🔐 Login called with:', { userData, authToken });
    
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    
    // Salva nel localStorage
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log('✅ Login completed, isAuthenticated:', true);
  };

  const logout = () => {
    console.log('🚪 Logout called');
    
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    console.log('✅ Logout completed');
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithGoogle: (payload?: { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('accurate_ai_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email === 'user.google@gmail.com') {
          localStorage.removeItem('accurate_ai_token');
          localStorage.removeItem('accurate_ai_user');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('accurate_ai_user');
    if (savedUser && savedUser.includes('user.google@gmail.com')) {
      return null;
    }
    return localStorage.getItem('accurate_ai_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser.email === 'user.google@gmail.com') {
        logout();
        return;
      }
      setUser(currentUser);
      localStorage.setItem('accurate_ai_user', JSON.stringify(currentUser));
    } catch (err) {
      console.warn('Failed to refresh user profile, session might be invalid');
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('auth_logout', handleLogoutEvent);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('accurate_ai_token', res.access_token);
    localStorage.setItem('accurate_ai_user', JSON.stringify(res.user));
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await authService.register(email, password, fullName);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('accurate_ai_token', res.access_token);
    localStorage.setItem('accurate_ai_user', JSON.stringify(res.user));
  };

  const loginWithGoogle = async (payload?: { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => {
    const res = await authService.googleAuth(payload);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('accurate_ai_token', res.access_token);
    localStorage.setItem('accurate_ai_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accurate_ai_token');
    localStorage.removeItem('accurate_ai_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

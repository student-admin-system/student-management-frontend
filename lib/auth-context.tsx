'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from './types';
import { api, getToken, setToken, removeToken, getStoredUser, setStoredUser, removeStoredUser } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAssistant: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const activeToken = getToken();
      if (!activeToken) {
        setUser(null);
        setTokenState(null);
        return;
      }
      setTokenState(activeToken);
      const profile = await api.get<User>('/auth/me');
      setUser(profile);
      setStoredUser(profile);
    } catch {
      setUser(null);
      setTokenState(null);
      removeToken();
      removeStoredUser();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser() as User | null;
    const storedToken = getToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setTokenState(storedToken);
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeToken();
    removeStoredUser();
    setUser(null);
    setTokenState(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAssistant = user?.role === 'ASSISTANT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isAssistant,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE = 'http://localhost:5000/api/v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('farmer_app_token');
    const savedUser = localStorage.getItem('farmer_app_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      fetchMe(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('farmer_app_user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to verify session:', err);
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, phone, password, role }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, role })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('farmer_app_token', data.token);
    localStorage.setItem('farmer_app_user', JSON.stringify(data.user));
    return data.user;
  };

  const login = async ({ email, password }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Invalid credentials');
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('farmer_app_token', data.token);
    localStorage.setItem('farmer_app_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('farmer_app_token');
    localStorage.removeItem('farmer_app_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

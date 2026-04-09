import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { chainoraApiBase } from '../configs/api';
import { refreshAuthToken } from '../services/authQrFlow';

type AuthState = {
  token: string;
  refreshToken: string;
  address: string;
  username?: string;
};

type AuthContextValue = {
  token: string;
  refreshToken: string;
  address: string;
  username: string;
  isAuthenticated: boolean;
  setAuthenticated: (next: AuthState) => void;
  refreshSession: () => Promise<string>;
  logout: () => void;
};

const AUTH_STORAGE_KEY = 'chainora.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const refreshTokenRef = useRef('');
  const addressRef = useRef('');
  const usernameRef = useRef('');
  const refreshInFlightRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      if (typeof parsed.token === 'string') {
        setToken(parsed.token);
      }
      if (typeof parsed.refreshToken === 'string') {
        setRefreshToken(parsed.refreshToken);
      }
      if (typeof parsed.address === 'string') {
        setAddress(parsed.address);
      }
      if (typeof parsed.username === 'string') {
        setUsername(parsed.username);
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const setAuthenticated = (next: AuthState) => {
    setToken(next.token);
    setRefreshToken(next.refreshToken);
    setAddress(next.address);
    setUsername(next.username ?? '');
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  };

  const logout = () => {
    setToken('');
    setRefreshToken('');
    setAddress('');
    setUsername('');
    refreshTokenRef.current = '';
    addressRef.current = '';
    usernameRef.current = '';
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
    addressRef.current = address;
    usernameRef.current = username;
  }, [refreshToken, address, username]);

  const attemptRefresh = async (): Promise<string> => {
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) {
      throw new Error('No refresh token available');
    }

    const next = await refreshAuthToken(chainoraApiBase, currentRefreshToken);
    setAuthenticated({
      token: next.token,
      refreshToken: next.refreshToken,
      address: next.address || addressRef.current,
      username: usernameRef.current,
    });

    return next.token;
  };

  const refreshSession = async (): Promise<string> => {
    if (!refreshInFlightRef.current) {
      refreshInFlightRef.current = attemptRefresh().finally(() => {
        refreshInFlightRef.current = null;
      });
    }

    return refreshInFlightRef.current;
  };

  useEffect(() => {
    let cancelled = false;

    const refreshNow = async () => {
      if (!refreshTokenRef.current) {
        return;
      }

      try {
        await refreshSession();
        if (cancelled) {
          return;
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    };

    void refreshNow();

    const timer = window.setInterval(() => {
      void refreshNow();
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      refreshToken,
      address,
      username,
      isAuthenticated: Boolean(token),
      setAuthenticated,
      refreshSession,
      logout,
    }),
    [token, refreshToken, address, username],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

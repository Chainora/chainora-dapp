import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAddress, isAddress } from 'viem';

import { fromInitAddress, toInitAddress } from '../components/UserDetail';
import { chainoraApiBase } from '../configs/api';
import { refreshAuthToken } from '../services/authService';
import { fetchAuthProfile, invalidateProfileCache } from '../services/profileService';

type AuthState = {
  token: string;
  refreshToken: string;
  address: string;
  initAddress?: string;
  username?: string;
  avatarUrl?: string;
};

type AuthContextValue = {
  token: string;
  refreshToken: string;
  address: string;
  initAddress: string;
  username: string;
  avatarUrl: string;
  isAuthenticated: boolean;
  setAuthenticated: (next: AuthState) => void;
  setAvatarUrl: (next: string) => void;
  refreshSession: () => Promise<string>;
  syncProfile: (force?: boolean) => Promise<void>;
  logout: () => void;
};

const AUTH_STORAGE_KEY = 'chainora.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveCanonicalEVMAddress = (rawAddress: string): string => {
  const trimmed = String(rawAddress ?? '').trim();
  if (!trimmed) {
    return '';
  }

  if (isAddress(trimmed)) {
    return getAddress(trimmed);
  }

  const converted = fromInitAddress(trimmed);
  if (!converted || !isAddress(converted)) {
    return '';
  }

  return getAddress(converted);
};

const resolveInitAddress = (evmAddress: string, fallbackRawInitAddress: string): string => {
  const normalizedEVM = String(evmAddress ?? '').trim();
  if (normalizedEVM) {
    const derived = toInitAddress(normalizedEVM);
    if (derived) {
      return derived.toLowerCase();
    }
  }

  const fallback = String(fallbackRawInitAddress ?? '').trim();
  if (fallback.toLowerCase().startsWith('init1')) {
    return fallback.toLowerCase();
  }

  return '';
};

const normalizeAuthAddresses = (rawAddress: string, rawInitAddress: string): { evmAddress: string; initAddress: string } => {
  const fromAddress = resolveCanonicalEVMAddress(rawAddress);
  const fromInit = resolveCanonicalEVMAddress(rawInitAddress);
  const evmAddress = fromAddress || fromInit;

  return {
    evmAddress,
    initAddress: resolveInitAddress(evmAddress, rawInitAddress),
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [address, setAddress] = useState('');
  const [initAddress, setInitAddress] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrlState] = useState('');
  const refreshTokenRef = useRef('');
  const addressRef = useRef('');
  const initAddressRef = useRef('');
  const usernameRef = useRef('');
  const avatarUrlRef = useRef('');
  const refreshInFlightRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
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
      const parsedAddress = typeof parsed.address === 'string' ? parsed.address : '';
      const parsedInitAddress = typeof parsed.initAddress === 'string' ? parsed.initAddress : '';
      const normalizedAddresses = normalizeAuthAddresses(parsedAddress, parsedInitAddress);
      setAddress(normalizedAddresses.evmAddress);
      setInitAddress(normalizedAddresses.initAddress);
      if (typeof parsed.username === 'string') {
        setUsername(parsed.username);
      }
      if (typeof parsed.avatarUrl === 'string') {
        setAvatarUrlState(parsed.avatarUrl);
      }
    } catch {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const setAuthenticated = (next: AuthState) => {
    const normalizedAddresses = normalizeAuthAddresses(next.address, next.initAddress ?? '');
    const nextState: AuthState = {
      ...next,
      address: normalizedAddresses.evmAddress,
      initAddress: normalizedAddresses.initAddress,
      username: next.username ?? '',
      avatarUrl: next.avatarUrl ?? '',
    };

    setToken(nextState.token);
    setRefreshToken(nextState.refreshToken);
    setAddress(nextState.address);
    setInitAddress(nextState.initAddress ?? '');
    setUsername(nextState.username ?? '');
    setAvatarUrlState(nextState.avatarUrl ?? '');
    invalidateProfileCache();
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
  };

  const setAvatarUrl = useCallback((next: string) => {
    const normalized = next.trim();
    setAvatarUrlState(normalized);
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token,
        refreshToken,
        address,
        initAddress,
        username,
        avatarUrl: normalized,
      }),
    );
  }, [token, refreshToken, address, initAddress, username]);

  const logout = () => {
    setToken('');
    setRefreshToken('');
    setAddress('');
    setInitAddress('');
    setUsername('');
    setAvatarUrlState('');
    refreshTokenRef.current = '';
    addressRef.current = '';
    initAddressRef.current = '';
    usernameRef.current = '';
    avatarUrlRef.current = '';
    invalidateProfileCache();
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
    addressRef.current = address;
    initAddressRef.current = initAddress;
    usernameRef.current = username;
    avatarUrlRef.current = avatarUrl;
  }, [refreshToken, address, initAddress, username, avatarUrl]);

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
      initAddress: initAddressRef.current,
      username: usernameRef.current,
      avatarUrl: avatarUrlRef.current,
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

  const syncProfile = async (force = false): Promise<void> => {
    if (!token) {
      return;
    }

    const withAccessToken = (accessToken: string): RequestInit => {
      const headers = new Headers();
      headers.set('Authorization', `Bearer ${accessToken}`);
      return { headers };
    };

    const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let response = await fetch(input, {
        ...init,
        ...withAccessToken(token),
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status !== 401) {
        return response;
      }

      const nextToken = await refreshSession();
      response = await fetch(input, {
        ...init,
        ...withAccessToken(nextToken),
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${nextToken}`,
        },
      });
      return response;
    };

    const profile = await fetchAuthProfile(authFetch, force);
    const normalizedUsername = profile.username?.trim() || '';
    const normalizedAddresses = normalizeAuthAddresses(profile.address?.trim() || address, initAddressRef.current);
    const normalizedAddress = normalizedAddresses.evmAddress;
    const normalizedInitAddress = normalizedAddresses.initAddress;
    const normalizedAvatarUrl = profile.avatarUrl?.trim() || '';

    setAddress(normalizedAddress);
    setInitAddress(normalizedInitAddress);
    setUsername(normalizedUsername);
    setAvatarUrlState(normalizedAvatarUrl);

    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token,
        refreshToken,
        address: normalizedAddress,
        initAddress: normalizedInitAddress,
        username: normalizedUsername,
        avatarUrl: normalizedAvatarUrl,
      }),
    );
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
      initAddress,
      username,
      avatarUrl,
      isAuthenticated: Boolean(token),
      setAuthenticated,
      setAvatarUrl,
      refreshSession,
      syncProfile,
      logout,
    }),
    [token, refreshToken, address, initAddress, username, avatarUrl, setAvatarUrl],
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

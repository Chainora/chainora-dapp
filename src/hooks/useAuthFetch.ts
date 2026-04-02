import { useCallback } from 'react';

import { useAuth } from '../context/AuthContext';

export function useAuthFetch() {
  const { token, refreshSession, logout } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const withAccessToken = (accessToken: string): RequestInit => {
        const headers = new Headers(init?.headers ?? undefined);
        headers.set('Authorization', `Bearer ${accessToken}`);

        return {
          ...init,
          headers,
        };
      };

      if (!token) {
        throw new Error('Unauthenticated');
      }

      let response = await fetch(input, withAccessToken(token));
      if (response.status !== 401) {
        return response;
      }

      try {
        const nextToken = await refreshSession();
        response = await fetch(input, withAccessToken(nextToken));
        if (response.status !== 401) {
          return response;
        }
      } catch {
        logout();
        throw new Error('Session expired');
      }

      logout();
      throw new Error('Session expired');
    },
    [token, refreshSession, logout],
  );

  return { authFetch };
}

type AuthEnvelope<T> = T | { success?: boolean; data?: T };

export type AuthSessionResponse = {
  sessionId: string;
  nonce: string;
};

export type VerifyAuthSessionRequest = {
  sessionId: string;
  address: string;
  signature: string;
  v?: number;
};

export type VerifyAuthSessionResponse = {
  verified: boolean;
  address: string;
  username?: string;
  token: string;
  refreshToken: string;
};

export type RefreshAuthResponse = {
  token: string;
  refreshToken: string;
  address: string;
};

const AUTH_FETCH_TIMEOUT_MS = 8_000;
const LOG = '[authService]';

const normalizeEnvelope = <T>(raw: AuthEnvelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `Backend ${url} timed out after ${timeoutMs}ms. Check VITE_CHAINORA_API_URL and that the API server is reachable.`,
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach backend ${url}. Verify the API base URL and network — the server may be down or on a different subnet.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const createAuthSession = async (apiBase: string): Promise<AuthSessionResponse> => {
  const url = `${apiBase}/v1/auth/session`;
  const response = await fetchWithTimeout(url, { method: 'GET' }, AUTH_FETCH_TIMEOUT_MS);

  if (!response.ok) {
    console.warn(`${LOG} createAuthSession non-OK status`, response.status);
    throw new Error(`Create auth session failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<AuthSessionResponse>);
  if (!data?.sessionId || !data?.nonce) {
    console.warn(`${LOG} createAuthSession invalid payload`, data);
    throw new Error('Invalid auth session response');
  }

  return data;
};

export const verifyAuthSession = async (
  apiBase: string,
  payload: VerifyAuthSessionRequest,
): Promise<VerifyAuthSessionResponse> => {
  const url = `${apiBase}/v1/auth/verify`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    AUTH_FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    console.warn(`${LOG} verifyAuthSession non-OK status`, response.status);
    throw new Error(`Verify auth session failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<VerifyAuthSessionResponse>);
  if (!data?.token || !data?.refreshToken) {
    console.warn(`${LOG} verifyAuthSession invalid payload`, data);
    throw new Error('Invalid auth verify response');
  }

  return data;
};

export const refreshAuthToken = async (apiBase: string, refreshToken: string): Promise<RefreshAuthResponse> => {
  const url = `${apiBase}/v1/auth/refresh`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    },
    AUTH_FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    console.warn(`${LOG} refreshAuthToken non-OK status`, response.status);
    throw new Error(`Refresh token failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<RefreshAuthResponse>);
  if (!data?.token || !data?.refreshToken) {
    console.warn(`${LOG} refreshAuthToken invalid payload`, data);
    throw new Error('Invalid refresh response');
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
    address: data.address ?? '',
  };
};

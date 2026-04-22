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

const normalizeEnvelope = <T>(raw: AuthEnvelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};

export const createAuthSession = async (apiBase: string): Promise<AuthSessionResponse> => {
  const response = await fetch(`${apiBase}/v1/auth/session`);
  if (!response.ok) {
    throw new Error(`Create auth session failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<AuthSessionResponse>);
  if (!data?.sessionId || !data?.nonce) {
    throw new Error('Invalid auth session response');
  }

  return data;
};

export const verifyAuthSession = async (
  apiBase: string,
  payload: VerifyAuthSessionRequest,
): Promise<VerifyAuthSessionResponse> => {
  const response = await fetch(`${apiBase}/v1/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Verify auth session failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<VerifyAuthSessionResponse>);
  if (!data?.token || !data?.refreshToken) {
    throw new Error('Invalid auth verify response');
  }

  return data;
};

export const refreshAuthToken = async (apiBase: string, refreshToken: string): Promise<RefreshAuthResponse> => {
  const response = await fetch(`${apiBase}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Refresh token failed: ${response.status}`);
  }

  const data = normalizeEnvelope((await response.json()) as AuthEnvelope<RefreshAuthResponse>);
  if (!data?.token || !data?.refreshToken) {
    throw new Error('Invalid refresh response');
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
    address: data.address ?? '',
  };
};

import { buildQrPayload } from './qrFlow';

export type AuthSessionResponse = {
  sessionId: string;
  nonce: string;
};

export type AuthWsEvent = {
  status?: string;
  sessionId?: string;
  address?: string;
  username?: string;
  token?: string;
  refreshToken?: string;
};

export type RefreshAuthResponse = {
  token: string;
  refreshToken: string;
  address: string;
};

export const createAuthSession = async (apiBase: string): Promise<AuthSessionResponse> => {
  const response = await fetch(`${apiBase}/v1/auth/session`);
  if (!response.ok) {
    throw new Error(`Create session failed: ${response.status}`);
  }

  const raw = (await response.json()) as
    | AuthSessionResponse
    | { success?: boolean; data?: AuthSessionResponse };

  const data =
    raw && typeof raw === 'object' && 'data' in raw && raw.data
      ? (raw.data as AuthSessionResponse)
      : (raw as AuthSessionResponse);

  if (!data?.sessionId || !data?.nonce) {
    throw new Error('Invalid session response');
  }

  return data;
};

export const buildAuthQrPayload = (apiBase: string, session: AuthSessionResponse): string => {
  return buildQrPayload({
    feature: 'auth.login',
    apiBase,
    data: {
      sessionId: session.sessionId,
      nonce: session.nonce,
      message: `Sign this to login to Chainora: ${session.nonce}`,
    },
  });
};

export const openAuthLoginSocket = (
  apiBase: string,
  sessionId: string,
  onEvent: (payload: AuthWsEvent) => void,
  onState: (state: string) => void,
): WebSocket => {
  const wsBase = apiBase.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/v1/auth/ws/${sessionId}`);

  onState('connecting');

  ws.onopen = () => onState('connected');
  ws.onmessage = event => {
    try {
      const payload = JSON.parse(String(event.data)) as AuthWsEvent;
      onEvent(payload);
    } catch {
      onState('message_error');
    }
  };
  ws.onerror = () => onState('error');
  ws.onclose = () => onState('closed');

  return ws;
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

  const raw = (await response.json()) as
    | RefreshAuthResponse
    | { success?: boolean; data?: RefreshAuthResponse };

  const data =
    raw && typeof raw === 'object' && 'data' in raw && raw.data
      ? (raw.data as RefreshAuthResponse)
      : (raw as RefreshAuthResponse);

  if (!data?.token || !data?.refreshToken) {
    throw new Error('Invalid refresh response');
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
    address: data.address ?? '',
  };
};

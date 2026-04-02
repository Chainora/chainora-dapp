import { buildQrPayload } from './qrFlow';

export type AuthSessionResponse = {
  sessionId: string;
  nonce: string;
};

export type AuthWsEvent = {
  status?: string;
  sessionId?: string;
  address?: string;
  token?: string;
};

export const createAuthSession = async (apiBase: string): Promise<AuthSessionResponse> => {
  const response = await fetch(`${apiBase}/v1/auth/session`);
  if (!response.ok) {
    throw new Error(`Create session failed: ${response.status}`);
  }

  const data = (await response.json()) as AuthSessionResponse;
  if (!data.sessionId || !data.nonce) {
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

import {
  createAuthSession,
  openAuthLoginSocket,
  type AuthSessionResponse,
  type AuthWsEvent,
} from './authQrFlow';

export type QrSessionResponse = AuthSessionResponse;
export type QrSessionWsEvent = AuthWsEvent;

// Shared QR session transport used by login/create-group/pool-action flows.
export const createQrSession = (apiBase: string): Promise<QrSessionResponse> => createAuthSession(apiBase);

export const openQrSessionSocket = (
  apiBase: string,
  sessionId: string,
  onEvent: (payload: QrSessionWsEvent) => void,
  onState: (state: string) => void,
): WebSocket => openAuthLoginSocket(apiBase, sessionId, onEvent, onState);

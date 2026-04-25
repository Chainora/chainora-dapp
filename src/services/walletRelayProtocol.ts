export const WALLET_RELAY_VERSION = '1';

export const RELAY_MESSAGE_TYPES = {
  pair: 'pair',
  connect: 'connect',
  signMessage: 'signMessage',
  signTransaction: 'signTransaction',
  approve: 'approve',
  reject: 'reject',
  error: 'error',
} as const;

export type RelayMessageType = (typeof RELAY_MESSAGE_TYPES)[keyof typeof RELAY_MESSAGE_TYPES];

export type WalletRelayMessage<TPayload = unknown> = {
  type: RelayMessageType;
  sessionId?: string;
  requestId?: string;
  timestamp?: number;
  chainId?: string;
  origin?: string;
  address?: string;
  payloadHash?: string;
  payload?: TPayload;
  error?: string;
};

export type WalletRelayPairResponse = {
  sessionId: string;
  pairingToken: string;
  browserToken: string;
  pairingUri: string;
  relayWsBase: string;
  chainId: string;
  origin: string;
  expiresAt: string;
  requestTimeoutMs: number;
};

export const createRelayRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const encodeRelayPayload = (payload: unknown): string => {
  return JSON.stringify(payload ?? null);
};

export const sha256Hex = async (payload: unknown): Promise<string> => {
  const data = new TextEncoder().encode(encodeRelayPayload(payload));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
};

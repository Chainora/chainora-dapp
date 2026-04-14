import { chainoraApiBase } from '../configs/api';

export type UnsignedRelayerPayload = {
  feature: string;
  sessionId: string;
  address: string;
  username: string;
  message: string;
};

const sanitizeRelayerErrorMessage = (raw: string): string => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const usageIndex = trimmed.indexOf('Usage:');
  if (usageIndex > 0) {
    return trimmed.slice(0, usageIndex).trim();
  }

  return trimmed;
};

const readApiErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed: ${response.status}`;
  const text = (await response.text()).trim();
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string; data?: { error?: string; message?: string } };
    const detail = String(
      parsed?.error ?? parsed?.message ?? parsed?.data?.error ?? parsed?.data?.message ?? text,
    ).trim();
    return sanitizeRelayerErrorMessage(detail) || fallback;
  } catch {
    return sanitizeRelayerErrorMessage(text) || fallback;
  }
};

const normalizeEnvelope = <T>(raw: unknown): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: unknown }).data) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};

export async function createUsernameRelayerPayload(address: string, username: string): Promise<UnsignedRelayerPayload> {
  const response = await fetch(`${chainoraApiBase}/v1/relayer/payload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, username }),
  });

  if (!response.ok) {
    const detail = await readApiErrorMessage(response);
    throw new Error(detail || `Create relayer payload failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return normalizeEnvelope<UnsignedRelayerPayload>(json);
}

export async function createPrimaryUsernameRelayerPayload(address: string, username: string): Promise<UnsignedRelayerPayload> {
  const response = await fetch(`${chainoraApiBase}/v1/relayer/primary/payload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, username }),
  });

  if (!response.ok) {
    const detail = await readApiErrorMessage(response);
    throw new Error(detail || `Create primary relayer payload failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return normalizeEnvelope<UnsignedRelayerPayload>(json);
}

export type RelayerWSEvent = {
  status: string;
  sessionId: string;
  txHash?: string;
  error?: string;
  username?: string;
  address?: string;
};

export function openUsernameRelayerSocket(
  sessionId: string,
  onMessage: (event: RelayerWSEvent) => void,
  onState: (state: 'open' | 'closed' | 'error') => void,
): WebSocket {
  const endpoint = `${chainoraApiBase.replace(/^http/i, 'ws')}/v1/relayer/ws/${encodeURIComponent(sessionId)}`;
  const ws = new WebSocket(endpoint);

  ws.onopen = () => onState('open');
  ws.onerror = () => onState('error');
  ws.onclose = () => onState('closed');
  ws.onmessage = evt => {
    try {
      const payload = JSON.parse(String(evt.data)) as RelayerWSEvent;
      onMessage(payload);
    } catch {
      // Ignore malformed websocket payload.
    }
  };

  return ws;
}

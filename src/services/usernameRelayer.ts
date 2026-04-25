import { chainoraApiBase } from '../configs/api';

export type UnsignedRelayerPayload = {
  feature: string;
  sessionId: string;
  address: string;
  username: string;
  message: string;
};

export type SubmitUsernameRelayerRequest = {
  sessionId: string;
  address: string;
  username: string;
  signature: string;
  v?: number;
};

export type SubmitUsernameRelayerResponse = {
  accepted: boolean;
  txHash?: string;
  address: string;
  username: string;
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

const submitRelayerRequest = async (
  endpoint: string,
  payload: SubmitUsernameRelayerRequest,
): Promise<SubmitUsernameRelayerResponse> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await readApiErrorMessage(response);
    throw new Error(detail || `Relayer submit failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return normalizeEnvelope<SubmitUsernameRelayerResponse>(json);
};

export const submitUsernameRelayerRequest = (payload: SubmitUsernameRelayerRequest): Promise<SubmitUsernameRelayerResponse> => {
  return submitRelayerRequest(`${chainoraApiBase}/v1/relayer/register`, payload);
};

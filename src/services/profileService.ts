import { chainoraApiBase } from '../configs/api';

export type AuthProfile = {
  address: string;
  username: string;
  avatarUrl: string;
  tCNR: string;
  kycStatus: string;
};

export type BasicProfile = {
  address: string;
  username: string;
  avatarUrl: string;
};

type Envelope<T> = T | { success?: boolean; data?: T };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const PROFILE_CACHE_TTL_MS = 15000;

let cachedProfile: AuthProfile | null = null;
let cachedAt = 0;
let inFlight: Promise<AuthProfile> | null = null;

const normalizeEnvelope = <T>(raw: Envelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};

export const invalidateProfileCache = (): void => {
  cachedProfile = null;
  cachedAt = 0;
};

export const fetchAuthProfile = async (authFetch: AuthFetch, force = false): Promise<AuthProfile> => {
  const now = Date.now();
  if (!force && cachedProfile && now-cachedAt < PROFILE_CACHE_TTL_MS) {
    return cachedProfile;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const response = await authFetch(`${chainoraApiBase}/v1/auth/profile`);
    if (!response.ok) {
      throw new Error(`Load profile failed: ${response.status}`);
    }

    const raw = (await response.json()) as Envelope<AuthProfile>;
    const profile = normalizeEnvelope(raw);

    cachedProfile = profile;
    cachedAt = Date.now();
    return profile;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

export const updateAuthProfileAvatar = async (
  authFetch: AuthFetch,
  avatarUrl: string,
): Promise<AuthProfile> => {
  const normalizedUrl = avatarUrl.trim();
  if (!normalizedUrl) {
    throw new Error('avatarUrl is required');
  }

  const response = await authFetch(`${chainoraApiBase}/v1/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatarUrl: normalizedUrl }),
  });

  if (!response.ok) {
    const rawError = (await response.text()).trim();
    if (!rawError) {
      throw new Error(`Update avatar failed: ${response.status}`);
    }

    try {
      const parsed = JSON.parse(rawError) as { error?: string; message?: string; data?: { error?: string; message?: string } };
      const detail = parsed.error || parsed.message || parsed.data?.error || parsed.data?.message;
      throw new Error(detail || `Update avatar failed: ${response.status}`);
    } catch {
      throw new Error(rawError || `Update avatar failed: ${response.status}`);
    }
  }

  const raw = (await response.json()) as Envelope<AuthProfile>;
  const profile = normalizeEnvelope(raw);
  cachedProfile = profile;
  cachedAt = Date.now();
  return profile;
};

export const fetchBasicProfilesByAddresses = async (
  accessToken: string,
  addresses: string[],
): Promise<BasicProfile[]> => {
  const normalized = Array.from(
    new Set(
      addresses
        .map(item => item.trim().toLowerCase())
        .filter(item => item !== ''),
    ),
  );

  if (normalized.length === 0) {
    return [];
  }

  const params = new URLSearchParams();
  params.set('addresses', normalized.join(','));

  const response = await fetch(`${chainoraApiBase}/v1/auth/profiles?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Load member profiles failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<BasicProfile[]>;
  const payload = normalizeEnvelope(raw);
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(item => ({
    address: String(item.address ?? '').trim(),
    username: String(item.username ?? '').trim(),
    avatarUrl: String(item.avatarUrl ?? '').trim(),
  }));
};

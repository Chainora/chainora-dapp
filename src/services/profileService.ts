import { chainoraApiBase } from '../configs/api';

export type AuthProfile = {
  address: string;
  username: string;
  tCNR: string;
  kycStatus: string;
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

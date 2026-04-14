const shouldLookupInitiaUsername = import.meta.env.VITE_ENABLE_INITIA_USERNAME_LOOKUP === 'true';

const configuredInitiaApiBase =
  import.meta.env.VITE_INITIA_API_URL?.trim() || import.meta.env.VITE_INITIA_LCD_URL?.trim() || '';

const isKnownUnsupportedUsernameHTTPBase = configuredInitiaApiBase.includes('api.testnet.initia.xyz');

type UsernameResult = {
  username?: string;
  name?: string;
  primaryName?: string;
};

type UsernameListResult = {
  usernames?: unknown;
  names?: unknown;
  items?: unknown;
  results?: unknown;
  data?: unknown;
};

const normalizeUsername = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('.init') ? trimmed.slice(0, -5) : trimmed;
};

const extractUsername = (value: unknown): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeUsername(value);
  }

  if (typeof value === 'object') {
    const data = value as UsernameResult;
    return normalizeUsername(data.username ?? data.name ?? data.primaryName ?? '');
  }

  return '';
};

const collectUsernames = (value: unknown, sink: Set<string>): void => {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    const parsed = normalizeUsername(value);
    if (parsed) {
      sink.add(parsed);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUsernames(item, sink);
    }
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  const obj = value as Record<string, unknown>;
  const direct = extractUsername(obj as UsernameResult);
  if (direct) {
    sink.add(direct);
  }

  const shape = obj as UsernameListResult;
  for (const key of ['usernames', 'names', 'items', 'results', 'data']) {
    const next = shape[key as keyof UsernameListResult];
    if (next !== undefined) {
      collectUsernames(next, sink);
    }
  }
};

const fetchInitiaPayload = async (path: string): Promise<unknown | null> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${configuredInitiaApiBase}${path}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

export async function resolvePrimaryInitiaUsername(address: string): Promise<string | null> {
  if (!shouldLookupInitiaUsername || !configuredInitiaApiBase) {
    return null;
  }
  if (isKnownUnsupportedUsernameHTTPBase) {
    return null;
  }

  const walletAddress = address.trim();
  if (!walletAddress) {
    return null;
  }

  const encodedAddress = encodeURIComponent(walletAddress);
  const fallbackPaths = [
    `/initia/usernames/v1/evm/primary/${encodedAddress}`,
    `/initia/usernames/v1beta1/evm/primary/${encodedAddress}`,
    `/initia/usernames/v1/primary/${walletAddress}`,
    `/initia/usernames/v1beta1/primary/${walletAddress}`,
  ];

  for (const path of fallbackPaths) {
    try {
      const payload = await fetchInitiaPayload(path);
      if (!payload) {
        continue;
      }
      const parsed = extractUsername(payload);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Continue trying remaining endpoints.
    }
  }

  return null;
}

export async function listInitiaUsernames(address: string): Promise<string[]> {
  if (!configuredInitiaApiBase) {
    return [];
  }
  if (isKnownUnsupportedUsernameHTTPBase) {
    return [];
  }

  const walletAddress = address.trim();
  if (!walletAddress) {
    return [];
  }

  const encodedAddress = encodeURIComponent(walletAddress);
  const candidatePaths = [
    `/initia/usernames/v1/evm/${encodedAddress}`,
    `/initia/usernames/v1beta1/evm/${encodedAddress}`,
    `/initia/usernames/v1/evm/usernames/${encodedAddress}`,
    `/initia/usernames/v1beta1/evm/usernames/${encodedAddress}`,
    `/initia/usernames/v1/address/${walletAddress}`,
    `/initia/usernames/v1beta1/address/${walletAddress}`,
    `/initia/usernames/v1/${walletAddress}`,
    `/initia/usernames/v1beta1/${walletAddress}`,
  ];

  const usernames = new Set<string>();
  for (const path of candidatePaths) {
    const payload = await fetchInitiaPayload(path);
    if (!payload) {
      continue;
    }
    collectUsernames(payload, usernames);
    if (usernames.size > 0) {
      break;
    }
  }

  return Array.from(usernames);
}

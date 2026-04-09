const configuredInitiaApiBase =
  import.meta.env.VITE_INITIA_LCD_URL?.trim() || import.meta.env.VITE_INITIA_API_URL?.trim() || '';

const defaultInitiaApiBase = configuredInitiaApiBase || 'https://api.testnet.initia.xyz';
const fallbackInitiaApiBases = ['https://api.testnet.initia.xyz', 'https://api.initia.xyz'];

type UsernameResult = {
  username?: string;
  name?: string;
  primaryName?: string;
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

export async function resolvePrimaryInitiaUsername(address: string): Promise<string | null> {
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

  const apiBases = [defaultInitiaApiBase, ...fallbackInitiaApiBases].filter(
    (base, index, all) => Boolean(base) && all.indexOf(base) === index,
  );

  for (const baseUrl of apiBases) {
    for (const path of fallbackPaths) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as unknown;
        const parsed = extractUsername(payload);
        if (parsed) {
          return parsed;
        }
      } catch {
        // Continue trying remaining endpoints.
      } finally {
        window.clearTimeout(timeout);
      }
    }
  }

  return null;
}

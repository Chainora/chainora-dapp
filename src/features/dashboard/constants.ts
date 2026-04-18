export const CONTRIBUTION_SYMBOL =
  (import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL as string | undefined) || 'tcUSD';

export const REFRESH_INTERVAL_MS = 10_000;
export const JOINED_REFRESH_INTERVAL_MS = 24_000;
export const JOINED_FILTER_TIMEOUT_MS = 3_500;

export const DASHBOARD_GROUP_CACHE_KEY_PREFIX = 'chainora:dashboard:groups:v1';
export const DASHBOARD_JOINED_POOL_CACHE_KEY_PREFIX = 'chainora:dashboard:joined-pools:v1';

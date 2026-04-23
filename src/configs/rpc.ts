const DEFAULT_RPC_URL = 'http://157.66.100.120:8545/';

export const resolveChainoraRpcUrl = (): string => {
  const raw = import.meta.env.VITE_CHAINORA_RPC_URL?.trim();
  if (!raw) {
    return DEFAULT_RPC_URL;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  // Relative URL (e.g. "/rpc/chainora"). In the browser this is served by the
  // Vite dev proxy (see vite.config.ts); in non-browser contexts we fall back
  // to the default origin so viem's http() still receives an absolute URL.
  if (typeof window !== 'undefined' && window.location) {
    return new URL(raw, window.location.origin).toString();
  }

  return DEFAULT_RPC_URL;
};

export const CHAINORA_RPC_URL = resolveChainoraRpcUrl();

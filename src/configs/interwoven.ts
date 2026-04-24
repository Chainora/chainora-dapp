const parseFlag = (rawValue: string | undefined, fallback: boolean): boolean => {
  if (typeof rawValue !== 'string') {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

const withFallback = (value: string | undefined, fallback: string): string => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const bridgeEnabled = parseFlag(import.meta.env.VITE_CHAINORA_ROLLUP_BRIDGE_ENABLED, false);
const defaultRollupChainId = withFallback(import.meta.env.VITE_CHAINORA_ROLLUP_CHAIN_ID, 'minievm-2');
const sourceChainId = withFallback(import.meta.env.VITE_CHAINORA_BRIDGE_SRC_CHAIN_ID, 'interwoven-1');
const sourceDenom = withFallback(import.meta.env.VITE_CHAINORA_BRIDGE_SRC_DENOM, 'uinit');
const destinationDenom = String(import.meta.env.VITE_CHAINORA_BRIDGE_DST_DENOM ?? '').trim();
const providerDefaultChainId = withFallback(
  import.meta.env.VITE_CHAINORA_INTERWOVEN_DEFAULT_CHAIN_ID,
  'initiation-2',
);

export const interwovenBridgeConfig = {
  enabled: bridgeEnabled,
  providerDefaultChainId,
  defaultChainId: defaultRollupChainId,
  routerApiUrl: String(import.meta.env.VITE_INITIA_ROUTER_API_URL ?? '').trim(),
  sourceChainId,
  sourceDenom,
  destinationDenom,
} as const;

export const interwovenBridgePrefill = {
  srcChainId: sourceChainId,
  srcDenom: sourceDenom,
  dstChainId: defaultRollupChainId,
  ...(destinationDenom ? { dstDenom: destinationDenom } : {}),
};

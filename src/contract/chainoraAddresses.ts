import type { Address } from 'viem';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export const CHAINORA_PROTOCOL_ADDRESSES = {
  registry: (import.meta.env.VITE_CHAINORA_REGISTRY_ADDRESS as Address | undefined) ?? ZERO_ADDRESS,
  factory: (import.meta.env.VITE_CHAINORA_FACTORY_ADDRESS as Address | undefined) ?? ZERO_ADDRESS,
  poolImplementation:
    (import.meta.env.VITE_CHAINORA_POOL_IMPLEMENTATION_ADDRESS as Address | undefined) ?? ZERO_ADDRESS,
  stablecoin: (import.meta.env.VITE_CHAINORA_STABLECOIN_ADDRESS as Address | undefined) ?? ZERO_ADDRESS,
} as const;

export { ZERO_ADDRESS };

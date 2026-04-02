import { injected } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

const initiaEvmTestnet = defineChain({
  id: 7234,
  name: 'Initia EVM Testnet',
  nativeCurrency: {
    name: 'INIT',
    symbol: 'INIT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_INITIA_RPC_URL ?? 'https://rpc.testnet.initia.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Initia Explorer',
      url: import.meta.env.VITE_INITIA_EXPLORER_URL ?? 'https://scan.testnet.initia.xyz',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [initiaEvmTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [initiaEvmTestnet.id]: http(import.meta.env.VITE_INITIA_RPC_URL ?? 'https://rpc.testnet.initia.xyz'),
  },
});

export { initiaEvmTestnet };

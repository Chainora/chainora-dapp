import { createConfig, createStorage, http } from 'wagmi';
import { defineChain } from 'viem';

import { chainoraRelayConnector } from '../connectors/chainoraRelayConnector';
import { CHAINORA_RPC_URL } from './rpc';

const chainoraChainId = Number(import.meta.env.VITE_CHAINORA_CHAIN_ID ?? 1123337227327254);
const chainoraRpcUrl = CHAINORA_RPC_URL;

const WAGMI_TAB_ID_KEY = 'chainora.tab.id';

const resolveWagmiTabId = (): string => {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const current = window.sessionStorage.getItem(WAGMI_TAB_ID_KEY);
  if (current) {
    return current;
  }

  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  window.sessionStorage.setItem(WAGMI_TAB_ID_KEY, generated);
  return generated;
};

const chainoraRollup = defineChain({
  id: Number.isFinite(chainoraChainId) && chainoraChainId > 0 ? chainoraChainId : 1123337227327254,
  name: 'Chainora Rollup',
  nativeCurrency: {
    name: 'Chainora Token',
    symbol: import.meta.env.VITE_CHAINORA_CURRENCY_SYMBOL ?? 'tCNR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [chainoraRpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Chainora Explorer',
      url: import.meta.env.VITE_CHAINORA_EXPLORER_URL ?? 'http://157.66.100.120:8545/',
    },
  },
  testnet: true,
});

const wagmiStorage = typeof window !== 'undefined'
  ? createStorage({
    key: `chainora.wagmi.${resolveWagmiTabId()}`,
    storage: window.sessionStorage,
  })
  : null;

export const wagmiConfig = createConfig({
  chains: [chainoraRollup],
  connectors: [chainoraRelayConnector()],
  storage: wagmiStorage,
  transports: {
    [chainoraRollup.id]: http(chainoraRpcUrl, {
      timeout: 15_000,
      retryCount: 3,
      retryDelay: 400,
    }),
  },
});

export { chainoraRollup };

import { injected } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

const chainoraChainId = Number(import.meta.env.VITE_CHAINORA_CHAIN_ID ?? 1123337227327254);
const chainoraRpcUrl = import.meta.env.VITE_CHAINORA_RPC_URL ?? 'http://157.66.100.120:8545/';

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
  testnet: false,
});

export const wagmiConfig = createConfig({
  chains: [chainoraRollup],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [chainoraRollup.id]: http(chainoraRpcUrl, {
      timeout: 8_000,
      retryCount: 1,
      retryDelay: 300,
    }),
  },
});

export { chainoraRollup };

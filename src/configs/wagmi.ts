import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { walletConnect } from 'wagmi/connectors';

import { CHAINORA_RPC_URL } from './rpc';

const chainoraChainId = Number(import.meta.env.VITE_CHAINORA_CHAIN_ID ?? 1123337227327254);
const chainoraRpcUrl = CHAINORA_RPC_URL;
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ||
  'f18b36387b29270d62dd0b4798411d5d';

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
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'Chainora',
        description: 'Chainora dApp with card-backed native wallet signer.',
        url: 'https://chainora.app',
        icons: ['https://chainora.app/icon.png'],
      },
    }),
  ],
  transports: {
    [chainoraRollup.id]: http(chainoraRpcUrl, {
      timeout: 15_000,
      retryCount: 3,
      retryDelay: 400,
    }),
  },
});

export { chainoraRollup };

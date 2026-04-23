import './polyfills/react-effect-event';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { WagmiProvider } from 'wagmi';
import {
  InterwovenKitProvider,
  MAINNET,
  TESTNET,
  injectStyles,
} from '@initia/interwovenkit-react';
import InterwovenKitStyles from '@initia/interwovenkit-react/styles.js';

import { wagmiConfig } from './configs/wagmi';
import { AuthProvider } from './context/AuthContext';
import { AppQueryProvider } from './query/provider';
import { router } from './router';
import './styles.css';

injectStyles(InterwovenKitStyles);

const interwovenNetwork =
  import.meta.env.VITE_INTERWOVEN_NETWORK?.trim().toLowerCase() || 'testnet';

const interwovenConfig = interwovenNetwork === 'mainnet' ? MAINNET : TESTNET;

const interwovenDefaultChainId =
  import.meta.env.VITE_INTERWOVEN_DEFAULT_CHAIN_ID?.trim() ||
  interwovenConfig.defaultChainId;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <AppQueryProvider>
        <InterwovenKitProvider
          {...interwovenConfig}
          defaultChainId={interwovenDefaultChainId}
          theme="light"
        >
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </InterwovenKitProvider>
      </AppQueryProvider>
    </WagmiProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { WagmiProvider } from 'wagmi';

import { wagmiConfig } from './configs/wagmi';
import { AppQueryProvider } from './query/provider';
import { router } from './router';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <AppQueryProvider>
        <RouterProvider router={router} />
      </AppQueryProvider>
    </WagmiProvider>
  </StrictMode>,
);

import { useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

import { createChainoraProtocolClient } from '../contract/chainoraProtocol';

export function useChainoraProtocol() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  if (!publicClient) {
    throw new Error('Public client unavailable for current chain');
  }

  const client = useMemo(() => createChainoraProtocolClient(publicClient, walletClient), [publicClient, walletClient]);

  return {
    address,
    isConnected,
    ...client,
  };
}

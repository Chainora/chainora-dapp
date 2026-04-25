import { useCallback, useMemo } from 'react';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

import { createChainoraProtocolClient } from '../contract/chainoraProtocol';

export function useChainoraProtocol() {
  const { address, isConnected } = useAccount();
  const { waitForTxConfirmation } = useInterwovenKit();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  if (!publicClient) {
    throw new Error('Public client unavailable for current chain');
  }

  const onTxSubmitted = useCallback(async (txHash: `0x${string}`) => {
    try {
      await waitForTxConfirmation({
        txHash,
        chainId: import.meta.env.VITE_INTERWOVEN_DEFAULT_CHAIN_ID?.trim() || undefined,
        timeoutMs: 90_000,
        intervalMs: 2_000,
      });
    } catch (error) {
      console.warn('[chainora-protocol][interwoven] tx confirmation fallback', error);
    }
  }, [waitForTxConfirmation]);

  const client = useMemo(
    () => createChainoraProtocolClient(publicClient, walletClient, { onTxSubmitted }),
    [onTxSubmitted, publicClient, walletClient],
  );

  return {
    address,
    isConnected,
    ...client,
  };
}

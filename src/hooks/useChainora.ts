import { useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';

import { HUI_ABI, HUI_CONTRACT_ADDRESS } from '../contract/constants';

export function useChainora() {
  const { address, isConnected } = useAccount();

  const currentRoundQuery = useReadContract({
    abi: HUI_ABI,
    address: HUI_CONTRACT_ADDRESS,
    functionName: 'currentRound',
    query: {
      enabled: isConnected,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const joinHui = async (amount: bigint) => {
    if (!isConnected || !address) {
      throw new Error('Connect wallet first.');
    }

    return writeContractAsync({
      abi: HUI_ABI,
      address: HUI_CONTRACT_ADDRESS,
      functionName: 'joinHui',
      args: [amount],
    });
  };

  return useMemo(
    () => ({
      address,
      isConnected,
      currentRound: currentRoundQuery.data,
      isRoundLoading: currentRoundQuery.isLoading,
      refetchRound: currentRoundQuery.refetch,
      joinHui,
      isJoinPending: isPending,
    }),
    [address, isConnected, currentRoundQuery.data, currentRoundQuery.isLoading, currentRoundQuery.refetch, isPending],
  );
}

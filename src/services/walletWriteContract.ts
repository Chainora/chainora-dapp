import type { Address, WalletClient } from 'viem';
import { writeContract as wagmiWriteContract } from 'wagmi/actions';

import { wagmiConfig } from '../configs/wagmi';

type WriteContractParams = {
  account: Address;
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  gas?: bigint;
  value?: bigint;
  chain?: WalletClient['chain'] | null;
};

const hasWriteContract = (
  client: WalletClient | null | undefined,
): client is WalletClient & { writeContract: (params: unknown) => Promise<`0x${string}`> } => {
  return Boolean(client && typeof (client as { writeContract?: unknown }).writeContract === 'function');
};

export const writeContractWithFallback = async (
  params: WriteContractParams,
  walletClient?: WalletClient | null,
): Promise<`0x${string}`> => {
  const baseParams = {
    account: params.account,
    address: params.address,
    abi: params.abi as never,
    functionName: params.functionName as never,
    args: (params.args ?? []) as never,
    gas: params.gas,
    value: params.value,
  };

  if (hasWriteContract(walletClient)) {
    const walletParams = params.chain
      ? { ...baseParams, chain: params.chain }
      : baseParams;
    return walletClient.writeContract(walletParams as never) as Promise<`0x${string}`>;
  }

  return wagmiWriteContract(wagmiConfig, baseParams as never) as Promise<`0x${string}`>;
};


import type { Address, PublicClient } from 'viem';

const GAS_BPS_DENOMINATOR = 10_000;
const DEFAULT_GAS_BUFFER_BPS = 12_000;

const normalizeGasBufferBps = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw?.trim() ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_GAS_BUFFER_BPS;
  }

  if (parsed < GAS_BPS_DENOMINATOR) {
    return GAS_BPS_DENOMINATOR;
  }

  return parsed;
};

const GAS_BUFFER_BPS = normalizeGasBufferBps(import.meta.env.VITE_CHAINORA_TX_GAS_BUFFER_BPS);

export const applyGasBuffer = (estimatedGas: bigint): bigint => {
  if (estimatedGas <= 0n) {
    return 0n;
  }

  return (estimatedGas * BigInt(GAS_BUFFER_BPS) + BigInt(GAS_BPS_DENOMINATOR - 1)) / BigInt(GAS_BPS_DENOMINATOR);
};

export const estimateBufferedContractGas = async (
  publicClient: PublicClient,
  params: {
    account: Address;
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  },
): Promise<bigint> => {
  const estimatedGas = await publicClient.estimateContractGas({
    account: params.account,
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    value: params.value,
  } as never);

  return applyGasBuffer(estimatedGas);
};

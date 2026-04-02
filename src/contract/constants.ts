import type { Address } from 'viem';

export const HUI_CONTRACT_ADDRESS =
  (import.meta.env.VITE_HUI_CONTRACT_ADDRESS as Address | undefined) ??
  ('0x0000000000000000000000000000000000000000' as Address);

export const HUI_ABI = [
  {
    type: 'function',
    name: 'currentRound',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinHui',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const;

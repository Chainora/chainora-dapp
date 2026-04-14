import type { Address, PublicClient, WalletClient } from 'viem';

import { CHAINORA_PROTOCOL_ADDRESSES, ZERO_ADDRESS } from './chainoraAddresses';
import { ERC20_ABI, FACTORY_ABI, POOL_ABI, REGISTRY_ABI } from './chainoraAbis';

export type PoolConfig = {
  contributionAmount: bigint;
  targetMembers: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
};

const ensureAddress = (address: Address, label: string) => {
  if (address.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    throw new Error(`${label} is not configured`);
  }
};

export const createChainoraProtocolClient = (publicClient: PublicClient, walletClient?: WalletClient) => {
  const getWalletClient = (): WalletClient => {
    if (!walletClient) {
      throw new Error('Wallet client not connected');
    }

    return walletClient;
  };

  const writeWithWallet = (params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => {
    const activeWalletClient = getWalletClient();

    return activeWalletClient.writeContract({
      ...params,
      chain: activeWalletClient.chain ?? null,
    } as never);
  };

  const getRegistryAddress = () => {
    const address = CHAINORA_PROTOCOL_ADDRESSES.registry;
    ensureAddress(address, 'VITE_CHAINORA_REGISTRY_ADDRESS');
    return address;
  };

  const getFactoryAddress = () => {
    const address = CHAINORA_PROTOCOL_ADDRESSES.factory;
    ensureAddress(address, 'VITE_CHAINORA_FACTORY_ADDRESS');
    return address;
  };

  const readRegistry = {
    stablecoin: async () =>
      publicClient.readContract({
        address: getRegistryAddress(),
        abi: REGISTRY_ABI,
        functionName: 'stablecoin',
      }),
    deviceAdapter: async () =>
      publicClient.readContract({
        address: getRegistryAddress(),
        abi: REGISTRY_ABI,
        functionName: 'deviceAdapter',
      }),
    reputationAdapter: async () =>
      publicClient.readContract({
        address: getRegistryAddress(),
        abi: REGISTRY_ABI,
        functionName: 'reputationAdapter',
      }),
    stakingAdapter: async () =>
      publicClient.readContract({
        address: getRegistryAddress(),
        abi: REGISTRY_ABI,
        functionName: 'stakingAdapter',
      }),
  };

  const readFactory = {
    poolCount: async () =>
      publicClient.readContract({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'poolCount',
      }),
    poolById: async (poolId: bigint) =>
      publicClient.readContract({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'poolById',
        args: [poolId],
      }),
  };

  const readPool = {
    poolStatus: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'poolStatus' }),
    currentCycle: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'currentCycle' }),
    currentPeriod: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'currentPeriod' }),
    activeMemberCount: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'activeMemberCount' }),
    cycleCompleted: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'cycleCompleted' }),
    members: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'members' }),
    isMember: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'isMember', args: [member] }),
    isActiveMember: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'isActiveMember', args: [member] }),
    memberDeposit: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'memberDeposit', args: [member] }),
    claimableYield: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'claimableYield', args: [member] }),
    periodInfo: async (poolAddress: Address, cycleId: bigint, periodId: bigint) =>
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'periodInfo',
        args: [cycleId, periodId],
      }),
  };

  const writeFactory = {
    createPool: async (config: PoolConfig) => {
      return writeWithWallet({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'createPool',
        args: [
          {
            contributionAmount: config.contributionAmount,
            targetMembers: config.targetMembers,
            periodDuration: config.periodDuration,
            contributionWindow: config.contributionWindow,
            auctionWindow: config.auctionWindow,
          },
        ],
      });
    },
  };

  const writeErc20 = {
    approve: async (tokenAddress: Address, spender: Address, amount: bigint) => {
      return writeWithWallet({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
      });
    },
  };

  const writePool = {
    proposeInvite: async (poolAddress: Address, candidate: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'proposeInvite',
        args: [candidate],
      });
    },
    voteInvite: async (poolAddress: Address, proposalId: bigint, support: boolean) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'voteInvite',
        args: [proposalId, support],
      });
    },
    acceptInviteAndLockDeposit: async (poolAddress: Address, proposalId: bigint) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'acceptInviteAndLockDeposit',
        args: [proposalId],
      });
    },
    contribute: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'contribute' });
    },
    submitDiscountBid: async (poolAddress: Address, discount: bigint) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'submitDiscountBid',
        args: [discount],
      });
    },
    closeAuctionAndSelectRecipient: async (poolAddress: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'closeAuctionAndSelectRecipient',
      });
    },
    claimPayout: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'claimPayout' });
    },
    claimYield: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'claimYield' });
    },
    finalizePeriod: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'finalizePeriod' });
    },
    markDefaultAndPause: async (poolAddress: Address, defaultedMember: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'markDefaultAndPause',
        args: [defaultedMember],
      });
    },
    voteContinueAfterPause: async (poolAddress: Address, support: boolean) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'voteContinueAfterPause',
        args: [support],
      });
    },
    voteExtendCycle: async (poolAddress: Address, support: boolean) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'voteExtendCycle',
        args: [support],
      });
    },
    archive: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'archive' });
    },
    leaveAfterArchive: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'leaveAfterArchive' });
    },
  };

  return {
    addresses: CHAINORA_PROTOCOL_ADDRESSES,
    readRegistry,
    readFactory,
    readPool,
    writeFactory,
    writeErc20,
    writePool,
  };
};

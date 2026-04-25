import { getAddress, isAddress, type Address, type PublicClient, type WalletClient } from 'viem';

import { CHAINORA_PROTOCOL_ADDRESSES, ZERO_ADDRESS } from './chainoraAddresses';
import { ERC20_ABI, FACTORY_ABI, POOL_ABI, REGISTRY_ABI } from './chainoraAbis';
import { estimateBufferedContractGas } from '../services/txGas';
import { writeContractWithFallback } from '../services/walletWriteContract';

export type PoolConfig = {
  contributionAmount: bigint;
  minReputation: bigint;
  targetMembers: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
  publicRecruitment?: boolean;
};

export type PoolDiscoveryView = {
  poolId: bigint;
  pool: Address;
  creator: Address;
  publicRecruitment: boolean;
  listed: boolean;
  poolStatus: number;
  activeMemberCount: bigint;
  targetMembers: number;
  contributionAmount: bigint;
  minReputation: bigint;
};

type ProtocolClientOptions = {
  onTxSubmitted?: (txHash: `0x${string}`) => Promise<void> | void;
};

const ensureAddress = (address: Address, label: string) => {
  if (address.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    throw new Error(`${label} is not configured`);
  }
};

export const createChainoraProtocolClient = (
  publicClient: PublicClient,
  walletClient?: WalletClient,
  options?: ProtocolClientOptions,
) => {
  const getWalletClient = (): WalletClient => {
    if (!walletClient) {
      throw new Error('Wallet client not connected');
    }

    return walletClient;
  };

  const resolveWalletAccount = (client: WalletClient): Address => {
    const raw = client.account as unknown;
    if (typeof raw === 'string' && isAddress(raw)) {
      return getAddress(raw);
    }

    if (raw && typeof raw === 'object' && 'address' in raw) {
      const address = (raw as { address?: unknown }).address;
      if (typeof address === 'string' && isAddress(address)) {
        return getAddress(address);
      }
    }

    throw new Error('Wallet account is unavailable.');
  };

  const writeWithWallet = async (params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) => {
    const activeWalletClient = getWalletClient();
    const account = resolveWalletAccount(activeWalletClient);
    const gas = await estimateBufferedContractGas(publicClient, {
      account,
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      value: params.value,
    });

    const txHash = await writeContractWithFallback({
      account,
      ...params,
      gas,
      chain: activeWalletClient.chain ?? null,
    }, activeWalletClient);

    if (options?.onTxSubmitted) {
      await options.onTxSubmitted(txHash as `0x${string}`);
    }

    return txHash;
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
    recruitingPoolCount: async () =>
      publicClient.readContract({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'recruitingPoolCount',
      }),
    recruitingPool: async (poolId: bigint) =>
      publicClient.readContract({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'recruitingPool',
        args: [poolId],
      }) as Promise<PoolDiscoveryView>,
    recruitingPools: async (offset: bigint, limit: bigint) =>
      publicClient.readContract({
        address: getFactoryAddress(),
        abi: FACTORY_ABI,
        functionName: 'recruitingPools',
        args: [offset, limit],
      }) as Promise<PoolDiscoveryView[]>,
  };

  const readPool = {
    creator: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'creator' }),
    poolStatus: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'poolStatus' }),
    publicRecruitment: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'publicRecruitment' }),
    targetMembers: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'targetMembers' }),
    minReputation: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'minReputation' }),
    periodDuration: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'periodDuration' }),
    contributionWindow: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'contributionWindow' }),
    auctionWindow: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'auctionWindow' }),
    currentCycle: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'currentCycle' }),
    currentPeriod: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'currentPeriod' }),
    activeMemberCount: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'activeMemberCount' }),
    cycleCompleted: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'cycleCompleted' }),
    extendVoteState: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'extendVoteState' }),
    members: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'members' }),
    activeMembers: async (poolAddress: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'activeMembers' }),
    isMember: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'isMember', args: [member] }),
    isActiveMember: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'isActiveMember', args: [member] }),
    memberDeposit: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'memberDeposit', args: [member] }),
    claimableYield: async (poolAddress: Address, member: Address) =>
      publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'claimableYield', args: [member] }),
    inviteProposal: async (poolAddress: Address, proposalId: bigint) =>
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'inviteProposal',
        args: [proposalId],
      }),
    periodInfo: async (poolAddress: Address, cycleId: bigint, periodId: bigint) =>
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'periodInfo',
        args: [cycleId, periodId],
      }),
    runtimeStatus: async (poolAddress: Address) =>
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'runtimeStatus',
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
            minReputation: config.minReputation,
            targetMembers: config.targetMembers,
            periodDuration: config.periodDuration,
            contributionWindow: config.contributionWindow,
            auctionWindow: config.auctionWindow,
          },
          config.publicRecruitment ?? true,
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
    acceptInvite: async (poolAddress: Address, proposalId: bigint) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'acceptInvite',
        args: [proposalId],
      });
    },
    submitJoinRequest: async (poolAddress: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'submitJoinRequest',
      });
    },
    voteJoinRequest: async (poolAddress: Address, requestId: bigint, support: boolean) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'voteJoinRequest',
        args: [requestId, support],
      });
    },
    acceptJoinRequest: async (poolAddress: Address, requestId: bigint) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'acceptJoinRequest',
        args: [requestId],
      });
    },
    cancelJoinRequest: async (poolAddress: Address, requestId: bigint) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'cancelJoinRequest',
        args: [requestId],
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
    syncRuntime: async (poolAddress: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'syncRuntime',
      });
    },
    claimPayout: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'claimPayout' });
    },
    claimYield: async (poolAddress: Address) => {
      return writeWithWallet({ address: poolAddress, abi: POOL_ABI, functionName: 'claimYield' });
    },
    markDefaultAndArchive: async (poolAddress: Address, defaultedMember: Address) => {
      return writeWithWallet({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'markDefaultAndArchive',
        args: [defaultedMember],
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

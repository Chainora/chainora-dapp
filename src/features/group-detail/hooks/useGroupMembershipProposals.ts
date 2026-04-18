import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Address, PublicClient } from 'viem';

import type { InviteProposalView } from '../../../components/group-detail/types';
import { POOL_ABI } from '../../../contract/chainoraAbis';
import {
  notNull,
  parseInviteProposal,
  parseJoinRequest,
  requiredTwoThirdsVotes,
} from '../utils';

const MEMBERSHIP_LOG_LOOKBACK_BLOCKS = 120_000n;

const INVITE_PROPOSED_EVENT = POOL_ABI.find(
  item => item.type === 'event' && item.name === 'ChainoraInviteProposed',
);

const INVITE_VOTED_EVENT = POOL_ABI.find(
  item => item.type === 'event' && item.name === 'ChainoraInviteVoted',
);

const JOIN_REQUEST_SUBMITTED_EVENT = POOL_ABI.find(
  item => item.type === 'event' && item.name === 'ChainoraJoinRequestSubmitted',
);

const JOIN_REQUEST_VOTED_EVENT = POOL_ABI.find(
  item => item.type === 'event' && item.name === 'ChainoraJoinRequestVoted',
);

type CursorState = {
  inviteProposalCursor: bigint | null;
  inviteVoteCursor: bigint | null;
  joinRequestCursor: bigint | null;
  joinVoteCursor: bigint | null;
  inviteProposalBlocks: Map<string, bigint>;
  joinRequestBlocks: Map<string, bigint>;
  inviteMyVotes: Map<string, 'yes' | 'no'>;
  joinMyVotes: Map<string, 'yes' | 'no'>;
};

type UseGroupMembershipProposalsParams = {
  publicClient: PublicClient | undefined;
  poolAddress: Address | null;
  viewerAddress: Address | null;
  isViewerActiveMember: boolean;
  enabled: boolean;
};

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
};

const ensureMapBound = (proposalBlocks: Map<string, bigint>, voteMap: Map<string, 'yes' | 'no'>): void => {
  const ids = Array.from(proposalBlocks.keys()).sort((left, right) => Number(right) - Number(left));
  if (ids.length <= 320) {
    return;
  }

  const keep = new Set(ids.slice(0, 320));
  for (const id of proposalBlocks.keys()) {
    if (!keep.has(id)) {
      proposalBlocks.delete(id);
      voteMap.delete(id);
    }
  }
};

const refreshProposalLogs = async (
  publicClient: PublicClient,
  poolAddress: Address,
  cursorState: CursorState,
): Promise<void> => {
  if (!INVITE_PROPOSED_EVENT || !JOIN_REQUEST_SUBMITTED_EVENT) {
    return;
  }

  const latest = await publicClient.getBlockNumber();

  const inviteFromBlock = cursorState.inviteProposalCursor === null
    ? (latest > MEMBERSHIP_LOG_LOOKBACK_BLOCKS ? latest - MEMBERSHIP_LOG_LOOKBACK_BLOCKS : 0n)
    : cursorState.inviteProposalCursor + 1n;

  if (inviteFromBlock <= latest) {
    const inviteLogs = await publicClient.getLogs({
      address: poolAddress,
      event: INVITE_PROPOSED_EVENT,
      fromBlock: inviteFromBlock,
      toBlock: latest,
    });

    for (const log of inviteLogs) {
      const args = log.args as { proposalId?: bigint };
      if (typeof args.proposalId === 'bigint') {
        cursorState.inviteProposalBlocks.set(args.proposalId.toString(), log.blockNumber ?? latest);
      }
    }
  }

  const requestFromBlock = cursorState.joinRequestCursor === null
    ? (latest > MEMBERSHIP_LOG_LOOKBACK_BLOCKS ? latest - MEMBERSHIP_LOG_LOOKBACK_BLOCKS : 0n)
    : cursorState.joinRequestCursor + 1n;

  if (requestFromBlock <= latest) {
    const requestLogs = await publicClient.getLogs({
      address: poolAddress,
      event: JOIN_REQUEST_SUBMITTED_EVENT,
      fromBlock: requestFromBlock,
      toBlock: latest,
    });

    for (const log of requestLogs) {
      const args = log.args as { requestId?: bigint };
      if (typeof args.requestId === 'bigint') {
        cursorState.joinRequestBlocks.set(args.requestId.toString(), log.blockNumber ?? latest);
      }
    }
  }

  cursorState.inviteProposalCursor = latest;
  cursorState.joinRequestCursor = latest;
};

const refreshViewerVoteLogs = async (
  publicClient: PublicClient,
  poolAddress: Address,
  viewerAddress: Address | null,
  cursorState: CursorState,
): Promise<void> => {
  if (!INVITE_VOTED_EVENT || !JOIN_REQUEST_VOTED_EVENT) {
    return;
  }

  if (!viewerAddress) {
    cursorState.inviteMyVotes.clear();
    cursorState.joinMyVotes.clear();
    return;
  }

  const latest = await publicClient.getBlockNumber();

  const inviteVoteFromBlock = cursorState.inviteVoteCursor === null
    ? (latest > MEMBERSHIP_LOG_LOOKBACK_BLOCKS ? latest - MEMBERSHIP_LOG_LOOKBACK_BLOCKS : 0n)
    : cursorState.inviteVoteCursor + 1n;

  if (inviteVoteFromBlock <= latest) {
    const inviteVotes = await publicClient.getLogs({
      address: poolAddress,
      event: INVITE_VOTED_EVENT,
      args: {
        voter: viewerAddress,
      },
      fromBlock: inviteVoteFromBlock,
      toBlock: latest,
    });

    for (const log of inviteVotes) {
      const args = log.args as { proposalId?: bigint; support?: boolean };
      if (typeof args.proposalId === 'bigint') {
        cursorState.inviteMyVotes.set(args.proposalId.toString(), args.support ? 'yes' : 'no');
      }
    }
  }

  const joinVoteFromBlock = cursorState.joinVoteCursor === null
    ? (latest > MEMBERSHIP_LOG_LOOKBACK_BLOCKS ? latest - MEMBERSHIP_LOG_LOOKBACK_BLOCKS : 0n)
    : cursorState.joinVoteCursor + 1n;

  if (joinVoteFromBlock <= latest) {
    const joinVotes = await publicClient.getLogs({
      address: poolAddress,
      event: JOIN_REQUEST_VOTED_EVENT,
      args: {
        voter: viewerAddress,
      },
      fromBlock: joinVoteFromBlock,
      toBlock: latest,
    });

    for (const log of joinVotes) {
      const args = log.args as { requestId?: bigint; support?: boolean };
      if (typeof args.requestId === 'bigint') {
        cursorState.joinMyVotes.set(args.requestId.toString(), args.support ? 'yes' : 'no');
      }
    }
  }

  cursorState.inviteVoteCursor = latest;
  cursorState.joinVoteCursor = latest;
};

const readInviteProposals = async (params: {
  publicClient: PublicClient;
  poolAddress: Address;
  viewerAddress: Address | null;
  isViewerActiveMember: boolean;
  fallbackActiveMemberCount: number;
  proposalBlocks: Map<string, bigint>;
  myVotes: Map<string, 'yes' | 'no'>;
}): Promise<InviteProposalView[]> => {
  const proposalIds = Array.from(params.proposalBlocks.keys());
  if (proposalIds.length === 0) {
    return [];
  }

  const proposalReads = await Promise.all(
    proposalIds.map(async proposalId => {
      try {
        const raw = await params.publicClient.readContract({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: 'inviteProposal',
          args: [BigInt(proposalId)],
        });

        const parsed = parseInviteProposal(raw);
        const proposalBlock = params.proposalBlocks.get(proposalId) ?? null;
        let quorumMemberCount = Math.max(params.fallbackActiveMemberCount, 1);
        let snapshotEligible = Boolean(params.isViewerActiveMember);

        if (proposalBlock !== null) {
          try {
            const quorumAtSnapshot = await params.publicClient.readContract({
              address: params.poolAddress,
              abi: POOL_ABI,
              functionName: 'activeMemberCount',
              blockNumber: proposalBlock,
            });
            quorumMemberCount = Math.max(Number(quorumAtSnapshot), 1);
          } catch {
            // Keep fallback quorum from latest snapshot.
          }

          if (params.viewerAddress) {
            try {
              const wasActiveAtSnapshot = await params.publicClient.readContract({
                address: params.poolAddress,
                abi: POOL_ABI,
                functionName: 'isActiveMember',
                args: [params.viewerAddress],
                blockNumber: proposalBlock,
              });
              snapshotEligible = Boolean(wasActiveAtSnapshot);
            } catch {
              snapshotEligible = Boolean(params.isViewerActiveMember);
            }
          } else {
            snapshotEligible = false;
          }
        }

        const requiredYesVotes = requiredTwoThirdsVotes(quorumMemberCount);
        const approvalRatio = Math.max(0, Math.min(100, Math.round((parsed.yesVotes / quorumMemberCount) * 100)));
        const myVote = params.myVotes.get(proposalId) ?? null;

        return {
          voteMode: 'invite',
          proposalId,
          candidate: parsed.candidate,
          yesVotes: parsed.yesVotes,
          noVotes: parsed.noVotes,
          open: parsed.open,
          myVote,
          quorumMemberCount,
          requiredYesVotes,
          approvalRatio,
          snapshotEligible,
          canVote: parsed.open && params.isViewerActiveMember && snapshotEligible && myVote === null,
        } satisfies InviteProposalView;
      } catch {
        return null;
      }
    }),
  );

  return proposalReads
    .filter(notNull)
    .sort((left, right) => Number(right.proposalId) - Number(left.proposalId));
};

const readJoinRequests = async (params: {
  publicClient: PublicClient;
  poolAddress: Address;
  viewerAddress: Address | null;
  isViewerActiveMember: boolean;
  fallbackActiveMemberCount: number;
  proposalBlocks: Map<string, bigint>;
  myVotes: Map<string, 'yes' | 'no'>;
}): Promise<InviteProposalView[]> => {
  const requestIds = Array.from(params.proposalBlocks.keys());
  if (requestIds.length === 0) {
    return [];
  }

  const requestReads = await Promise.all(
    requestIds.map(async requestId => {
      try {
        const raw = await params.publicClient.readContract({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: 'joinRequest',
          args: [BigInt(requestId)],
        });

        const parsed = parseJoinRequest(raw);
        const requestBlock = params.proposalBlocks.get(requestId) ?? null;
        let quorumMemberCount = Math.max(params.fallbackActiveMemberCount, 1);
        let snapshotEligible = Boolean(params.isViewerActiveMember);

        if (requestBlock !== null) {
          try {
            const quorumAtSnapshot = await params.publicClient.readContract({
              address: params.poolAddress,
              abi: POOL_ABI,
              functionName: 'activeMemberCount',
              blockNumber: requestBlock,
            });
            quorumMemberCount = Math.max(Number(quorumAtSnapshot), 1);
          } catch {
            // Keep fallback quorum from latest snapshot.
          }

          if (params.viewerAddress) {
            try {
              const wasActiveAtSnapshot = await params.publicClient.readContract({
                address: params.poolAddress,
                abi: POOL_ABI,
                functionName: 'isActiveMember',
                args: [params.viewerAddress],
                blockNumber: requestBlock,
              });
              snapshotEligible = Boolean(wasActiveAtSnapshot);
            } catch {
              snapshotEligible = Boolean(params.isViewerActiveMember);
            }
          } else {
            snapshotEligible = false;
          }
        }

        const requiredYesVotes = requiredTwoThirdsVotes(quorumMemberCount);
        const approvalRatio = Math.max(0, Math.min(100, Math.round((parsed.yesVotes / quorumMemberCount) * 100)));
        const myVote = params.myVotes.get(requestId) ?? null;

        return {
          voteMode: 'join-request',
          proposalId: requestId,
          candidate: parsed.applicant,
          yesVotes: parsed.yesVotes,
          noVotes: parsed.noVotes,
          open: parsed.open,
          myVote,
          quorumMemberCount,
          requiredYesVotes,
          approvalRatio,
          snapshotEligible,
          canVote: parsed.open && params.isViewerActiveMember && snapshotEligible && myVote === null,
        } satisfies InviteProposalView;
      } catch {
        return null;
      }
    }),
  );

  return requestReads
    .filter(notNull)
    .sort((left, right) => Number(right.proposalId) - Number(left.proposalId));
};

export const useGroupMembershipProposals = ({
  publicClient,
  poolAddress,
  viewerAddress,
  isViewerActiveMember,
  enabled,
}: UseGroupMembershipProposalsParams) => {
  const cursorsRef = useRef<CursorState>({
    inviteProposalCursor: null,
    inviteVoteCursor: null,
    joinRequestCursor: null,
    joinVoteCursor: null,
    inviteProposalBlocks: new Map(),
    joinRequestBlocks: new Map(),
    inviteMyVotes: new Map(),
    joinMyVotes: new Map(),
  });

  const poolAddressKey = poolAddress?.toLowerCase() ?? '';
  const viewerAddressKey = viewerAddress?.toLowerCase() ?? '';

  useEffect(() => {
    cursorsRef.current = {
      inviteProposalCursor: null,
      inviteVoteCursor: null,
      joinRequestCursor: null,
      joinVoteCursor: null,
      inviteProposalBlocks: new Map(),
      joinRequestBlocks: new Map(),
      inviteMyVotes: new Map(),
      joinMyVotes: new Map(),
    };
  }, [poolAddressKey, viewerAddressKey]);

  const query = useQuery({
    queryKey: ['group-membership-proposals', poolAddressKey, viewerAddressKey],
    enabled: enabled && Boolean(publicClient) && Boolean(poolAddress),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: enabled && isDocumentVisible() ? 60_000 : false,
    queryFn: async (): Promise<InviteProposalView[]> => {
      if (!publicClient || !poolAddress) {
        return [];
      }

      const cursorState = cursorsRef.current;

      await refreshProposalLogs(publicClient, poolAddress, cursorState);
      await refreshViewerVoteLogs(publicClient, poolAddress, viewerAddress, cursorState);

      ensureMapBound(cursorState.inviteProposalBlocks, cursorState.inviteMyVotes);
      ensureMapBound(cursorState.joinRequestBlocks, cursorState.joinMyVotes);

      let fallbackActiveMemberCount = 1;
      try {
        const activeMemberCount = await publicClient.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'activeMemberCount',
        });
        fallbackActiveMemberCount = Math.max(Number(activeMemberCount), 1);
      } catch {
        fallbackActiveMemberCount = 1;
      }

      const [inviteProposals, joinRequests] = await Promise.all([
        readInviteProposals({
          publicClient,
          poolAddress,
          viewerAddress,
          isViewerActiveMember,
          fallbackActiveMemberCount,
          proposalBlocks: cursorState.inviteProposalBlocks,
          myVotes: cursorState.inviteMyVotes,
        }),
        readJoinRequests({
          publicClient,
          poolAddress,
          viewerAddress,
          isViewerActiveMember,
          fallbackActiveMemberCount,
          proposalBlocks: cursorState.joinRequestBlocks,
          myVotes: cursorState.joinMyVotes,
        }),
      ]);

      return [...inviteProposals, ...joinRequests].sort(
        (left, right) => Number(right.proposalId) - Number(left.proposalId),
      );
    },
  });

  return useMemo(() => ({
    proposals: enabled ? (query.data ?? []) : [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }), [enabled, query.data, query.error, query.isFetching, query.isLoading, query.refetch]);
};

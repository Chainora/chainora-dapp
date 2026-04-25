import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAddress, isAddress, parseAbiItem, type Address } from 'viem';
import { usePublicClient } from 'wagmi';

import { fromInitAddress, toInitAddress } from '../../../components/UserDetail';
import type { InviteProposalView, MembershipVoteMode } from '../../../components/group-detail/types';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchBasicProfilesByAddresses,
  fetchBasicProfilesByUsernames,
  type BasicProfile,
} from '../../../services/profileService';
import {
  type ApiGroup,
  type ApiGroupDetailView,
  type ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import {
  formatInitCompact,
  formatToken,
  parseTokenAmountInput,
  requiredTwoThirdsVotes,
  toUsernameLabel,
} from '../utils';
import {
  deriveActivePhase,
  deriveLifecycleStatus,
  getCurrentPeriod,
  getTotalPeriods,
  resolveViewGroup,
} from '../model';
import { useGroupOverviewQuery } from './useGroupOverviewQuery';
import { useGroupPhaseViewQuery } from './useGroupPhaseViewQuery';
import { usePhasePermissions } from './usePhasePermissions';
import { type PoolActionCompletion, type PoolActionIntent, usePoolActionWallet } from './usePoolActionWallet';
import { useGroupMembershipProposals } from './useGroupMembershipProposals';
import type { MemberPhaseView } from '../components/MemberStatePanel';
import type { UiToast } from '../types';

const CHAINORA_BID_SUBMITTED_EVENT = parseAbiItem(
  'event ChainoraBidSubmitted(uint256 indexed cycleId, uint256 indexed periodId, address indexed bidder, uint256 discount)',
);
const CHAINORA_PERIOD_FINALIZED_EVENT = parseAbiItem(
  'event ChainoraPeriodFinalized(uint256 indexed cycleId, uint256 indexed periodId)',
);
const CHAINORA_EXTEND_VOTED_EVENT = parseAbiItem(
  'event ChainoraExtendVoted(address indexed voter, bool support, uint256 yesVotes, uint256 requiredVotes)',
);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type GroupDetailProps = {
  poolId: string;
};

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
};

const parseViewerAddress = (raw: string): Address | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (isAddress(trimmed)) {
    return getAddress(trimmed);
  }
  const converted = fromInitAddress(trimmed);
  if (converted && isAddress(converted)) {
    return getAddress(converted);
  }
  return null;
};

const buildMemberKey = (addresses: string[]): string => addresses.map(item => item.toLowerCase()).join(',');

const normalizeCandidateUsername = (value: string): string => {
  let normalized = value.trim();
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1).trim();
  }

  normalized = normalized.toLowerCase();
  if (normalized.endsWith('.init')) {
    normalized = normalized.slice(0, -5).trim();
  }

  return normalized;
};

const derivePayoutAmount = (periodMeta: ApiGroupViewPeriodMeta | undefined): string => {
  if (!periodMeta) {
    return '0';
  }

  const parseOrZero = (value: string): bigint => {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  };

  const payoutTarget = parseOrZero(periodMeta.totalContributed);
  const highestBidAmount = parseOrZero(periodMeta.bestDiscount);
  if (payoutTarget > 0n) {
    const payoutAmount = payoutTarget - highestBidAmount;
    return (payoutAmount > 0n ? payoutAmount : 0n).toString();
  }

  return periodMeta.payoutAmount;
};

export function useGroupDetail({ poolId }: GroupDetailProps) {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const {
    isAuthenticated,
    token,
    refreshSession,
    address,
    username,
    avatarUrl,
  } = useAuth();

  const viewerAddress = useMemo(() => parseViewerAddress(address), [address]);
  const [syncWithChain, setSyncWithChain] = useState(false);
  const hasCompletedInitialChainSyncRef = useRef(false);
  const chainSyncInFlightRef = useRef(false);
  const nearDeadlineSyncKeyRef = useRef('');
  const postDeadlineSyncKeyRef = useRef('');
  const postDeadlineTimerRef = useRef<number | null>(null);
  const phaseMismatchSyncKeyRef = useRef('');

  useEffect(() => {
    setSyncWithChain(false);
    hasCompletedInitialChainSyncRef.current = false;
    chainSyncInFlightRef.current = false;
    nearDeadlineSyncKeyRef.current = '';
    postDeadlineSyncKeyRef.current = '';
    phaseMismatchSyncKeyRef.current = '';
    if (typeof window !== 'undefined' && postDeadlineTimerRef.current !== null) {
      window.clearTimeout(postDeadlineTimerRef.current);
      postDeadlineTimerRef.current = null;
    }

    return () => {
      if (typeof window !== 'undefined' && postDeadlineTimerRef.current !== null) {
        window.clearTimeout(postDeadlineTimerRef.current);
        postDeadlineTimerRef.current = null;
      }
    };
  }, [poolId]);

  const overviewQuery = useGroupOverviewQuery({
    poolId,
    accessToken: token,
    refreshSession,
    enabled: isAuthenticated && Boolean(token),
    sync: syncWithChain,
  });

  const overview = overviewQuery.data;
  const overviewActivePeriod = getCurrentPeriod(overview);
  const overviewActivePhase = deriveActivePhase(overview);
  const activeSelectionHint = true;

  const viewQuery = useGroupPhaseViewQuery({
    poolId,
    accessToken: token,
    refreshSession,
    enabled: isAuthenticated && Boolean(token) && Boolean(overview),
    activeSelectionHint,
    sync: syncWithChain,
  });

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    if (syncWithChain || hasCompletedInitialChainSyncRef.current || chainSyncInFlightRef.current) {
      return;
    }
    if (!overviewQuery.data || !viewQuery.data) {
      return;
    }

    setSyncWithChain(true);
  }, [isAuthenticated, overviewQuery.data, syncWithChain, token, viewQuery.data]);

  useEffect(() => {
    if (!syncWithChain || chainSyncInFlightRef.current) {
      return;
    }

    chainSyncInFlightRef.current = true;
    let active = true;

    void Promise.allSettled([
      overviewQuery.refetch(),
      viewQuery.refetch(),
    ]).finally(() => {
      chainSyncInFlightRef.current = false;
      if (!active) {
        return;
      }
      hasCompletedInitialChainSyncRef.current = true;
      setSyncWithChain(false);
    });

    return () => {
      active = false;
    };
  }, [overviewQuery.refetch, syncWithChain, viewQuery.refetch]);

  const phaseView = viewQuery.data;
  const group = resolveViewGroup(overview, phaseView) as ApiGroup | undefined;
  const groupStatus = deriveLifecycleStatus(group);

  const activePeriod = phaseView?.selection.activePeriod ?? overviewActivePeriod;
  const activePhase = phaseView?.selection.activePhase ?? overviewActivePhase;
  const totalPeriods = getTotalPeriods(group ?? overview);

  const memberAddresses = useMemo(() => {
    const source = phaseView?.memberStates ?? [];
    const unique = new Set<string>();
    for (const member of source) {
      const normalized = member.address?.trim();
      if (normalized) {
        unique.add(normalized.toLowerCase());
      }
    }
    return Array.from(unique).sort();
  }, [phaseView?.memberStates]);

  const memberProfilesQuery = useQuery({
    queryKey: ['group-member-identities', poolId, buildMemberKey(memberAddresses)],
    enabled: isAuthenticated && Boolean(token) && memberAddresses.length > 0,
    staleTime: 90_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<BasicProfile[]> => {
      try {
        return await fetchBasicProfilesByAddresses(token, memberAddresses);
      } catch {
        const nextToken = await refreshSession();
        return fetchBasicProfilesByAddresses(nextToken, memberAddresses);
      }
    },
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, BasicProfile>();
    for (const profile of memberProfilesQuery.data ?? []) {
      const normalized = profile.address.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      map.set(normalized, profile);
    }

    if (viewerAddress) {
      const key = viewerAddress.toLowerCase();
      const existing = map.get(key);
      map.set(key, {
        address: viewerAddress,
        username: username || existing?.username || '',
        avatarUrl: avatarUrl || existing?.avatarUrl || '',
        reputationScore: existing?.reputationScore || '0',
        joinedGroupsCount: existing?.joinedGroupsCount ?? 0,
      });
    }

    return map;
  }, [avatarUrl, memberProfilesQuery.data, username, viewerAddress]);

  const isViewerMember = useMemo(
    () => (phaseView?.memberStates ?? []).some(member => member.isCurrentUser),
    [phaseView?.memberStates],
  );

  const isViewerActiveMember = useMemo(
    () => (phaseView?.memberStates ?? []).some(member => member.isCurrentUser && member.isActiveMember),
    [phaseView?.memberStates],
  );

  const permissionView = usePhasePermissions({
    group,
    permissions: phaseView?.permissions,
    selection: phaseView?.selection,
    runtime: phaseView?.runtime,
    isViewerMember,
  });

  const poolAddress = useMemo(() => {
    const raw = group?.poolAddress?.trim() ?? '';
    if (!raw || !isAddress(raw)) {
      return null;
    }
    return getAddress(raw);
  }, [group?.poolAddress]);

  const activeCycleForBids = useMemo(() => {
    try {
      const fallbackCycle = Number(group?.currentCycle ?? '1');
      if (!Number.isFinite(fallbackCycle) || fallbackCycle <= 0) {
        return 1;
      }
      const normalizedFallback = Math.floor(fallbackCycle);
      if (
        phaseView?.selection.isCurrentActivePhase
        && phaseView.selection.cycle
        && phaseView.selection.cycle > 0
      ) {
        return Math.floor(phaseView.selection.cycle);
      }
      return normalizedFallback;
    } catch {
      return 1;
    }
  }, [group?.currentCycle, phaseView?.selection.cycle, phaseView?.selection.isCurrentActivePhase]);

  const activePeriodForBids = useMemo(() => {
    if (phaseView?.selection.activePeriod && phaseView.selection.activePeriod > 0) {
      return Math.floor(phaseView.selection.activePeriod);
    }
    return activePeriod > 0 ? activePeriod : 1;
  }, [activePeriod, phaseView?.selection.activePeriod]);

  const activePhaseForBids = phaseView?.selection.activePhase ?? activePhase;

  const memberBidsQuery = useQuery({
    queryKey: ['group-member-bids', poolId, poolAddress?.toLowerCase() ?? '', activeCycleForBids, activePeriodForBids, activePhaseForBids],
    enabled:
      Boolean(publicClient)
      && Boolean(poolAddress)
      && activePhaseForBids === 'bidding'
      && activeCycleForBids > 0
      && activePeriodForBids > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: query => {
      if (!isDocumentVisible()) {
        return false;
      }
      const data = query.state.data as Record<string, string> | undefined;
      if (!data || Object.keys(data).length === 0) {
        return 4_000;
      }
      return 8_000;
    },
    retry: false,
    queryFn: async (): Promise<Record<string, string>> => {
      if (!publicClient || !poolAddress) {
        return {};
      }

      const cycleId = BigInt(activeCycleForBids);
      const periodId = BigInt(activePeriodForBids);
      const filteredLogs = await publicClient.getLogs({
        address: poolAddress,
        event: CHAINORA_BID_SUBMITTED_EVENT,
        args: { cycleId, periodId },
      });

      let logs = filteredLogs;
      const bestBidderKey = phaseView?.periodMeta.bestBidder?.trim().toLowerCase() ?? '';
      const hasBestBidder = bestBidderKey !== '' && bestBidderKey !== ZERO_ADDRESS;
      if (logs.length === 0 && hasBestBidder) {
        try {
          const fallbackLogs = await publicClient.getLogs({
            address: poolAddress,
            event: CHAINORA_BID_SUBMITTED_EVENT,
            fromBlock: 0n,
            toBlock: 'latest',
          });
          logs = fallbackLogs.filter(log => (
            log.args.cycleId === cycleId
            && log.args.periodId === periodId
          ));
        } catch {
          logs = filteredLogs;
        }
      }

      const bids: Record<string, string> = {};
      for (const log of logs) {
        const bidder = log.args.bidder;
        const discount = log.args.discount;
        if (typeof bidder !== 'string' || typeof discount !== 'bigint') {
          continue;
        }
        bids[bidder.toLowerCase()] = discount.toString();
      }
      return bids;
    },
  });

  const extensionVotesQuery = useQuery({
    queryKey: [
      'group-extension-votes',
      poolId,
      poolAddress?.toLowerCase() ?? '',
      activeCycleForBids,
      activePeriodForBids,
      activePhaseForBids,
    ],
    enabled:
      Boolean(publicClient)
      && Boolean(poolAddress)
      && groupStatus === 'voting_extension'
      && activePhaseForBids === 'ending'
      && activeCycleForBids > 0
      && activePeriodForBids > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<Record<string, 'continue' | 'end'>> => {
      if (!publicClient || !poolAddress) {
        return {};
      }

      const cycleId = BigInt(activeCycleForBids);
      const periodId = BigInt(activePeriodForBids);
      const periodFinalizedLogs = await publicClient.getLogs({
        address: poolAddress,
        event: CHAINORA_PERIOD_FINALIZED_EVENT,
        args: { cycleId, periodId },
      });
      const fromBlock = periodFinalizedLogs[periodFinalizedLogs.length - 1]?.blockNumber;
      if (typeof fromBlock !== 'bigint') {
        return {};
      }

      const extendVoteLogs = await publicClient.getLogs({
        address: poolAddress,
        event: CHAINORA_EXTEND_VOTED_EVENT,
        fromBlock,
        toBlock: 'latest',
      });

      const votes: Record<string, 'continue' | 'end'> = {};
      for (const log of extendVoteLogs) {
        const voter = log.args.voter;
        const support = log.args.support;
        if (typeof voter !== 'string' || typeof support !== 'boolean') {
          continue;
        }
        votes[voter.toLowerCase()] = support ? 'continue' : 'end';
      }
      return votes;
    },
  });

  const memberPhaseViews = useMemo<MemberPhaseView[]>(() => {
    const states = phaseView?.memberStates ?? [];
    const memberBids = memberBidsQuery.data ?? {};
    const extensionVotes = extensionVotesQuery.data ?? {};
    const recipientLower = phaseView?.periodMeta.recipient?.trim().toLowerCase() ?? '';
    const hasRecipient = Boolean(recipientLower) && recipientLower !== ZERO_ADDRESS;

    return states.map(member => {
      const normalizedAddress = member.address.trim().toLowerCase();
      const profile = profileMap.get(normalizedAddress);
      const initAddress = toInitAddress(member.address) || member.address;
      const displayLabel = profile?.username
        ? toUsernameLabel(profile.username)
        : formatInitCompact(initAddress);
      const bidAmountRaw = activePhaseForBids === 'bidding'
        ? memberBids[normalizedAddress] ?? null
        : null;
      let state = member.state;
      let badge = member.badge;
      if (groupStatus === 'voting_extension' && activePhaseForBids === 'ending') {
        const memberVote = extensionVotes[normalizedAddress];
        if (memberVote === 'continue') {
          state = 'vote_continue';
          badge = 'Vote: Continue';
        } else if (memberVote === 'end') {
          state = 'vote_end';
          badge = 'Vote: End';
        } else {
          state = 'vote_pending';
          badge = 'No vote yet';
        }
      } else if (activePhaseForBids === 'ending' && member.state === 'pending_finalize') {
        if (hasRecipient && normalizedAddress === recipientLower) {
          badge = `Claimer period ${activePeriodForBids}`;
        } else {
          badge = '';
        }
      }

      return {
        address: member.address,
        displayLabel,
        secondaryLabel: initAddress,
        avatarUrl: profile?.avatarUrl || '',
        reputationScore: profile?.reputationScore || '0',
        joinedGroupsCount: profile?.joinedGroupsCount ?? 0,
        state,
        badge,
        isCurrentUser: Boolean(member.isCurrentUser),
        bidAmountRaw,
        bidAmountLabel: bidAmountRaw ? formatToken(bidAmountRaw) : null,
      };
    });
  }, [
    memberBidsQuery.data,
    extensionVotesQuery.data,
    phaseView?.memberStates,
    phaseView?.periodMeta.recipient,
    groupStatus,
    profileMap,
    activePeriodForBids,
    activePhaseForBids,
  ]);

  const canProposeInvite = groupStatus === 'forming' && isViewerActiveMember;
  const canLeaveDuringForming = groupStatus === 'forming' && isViewerMember;
  const [candidateAddress, setCandidateAddressState] = useState('');

  const membershipProposalsQuery = useGroupMembershipProposals({
    publicClient,
    poolAddress,
    viewerAddress,
    isViewerActiveMember,
    enabled: isAuthenticated && groupStatus === 'forming',
  });

  const proposalCandidateAddresses = useMemo(() => {
    const unique = new Set<string>();
    for (const proposal of membershipProposalsQuery.proposals ?? []) {
      const normalized = proposal.candidate?.trim();
      if (normalized) {
        unique.add(normalized.toLowerCase());
      }
    }
    return Array.from(unique).sort();
  }, [membershipProposalsQuery.proposals]);

  const proposalProfilesQuery = useQuery({
    queryKey: ['group-proposal-identities', poolId, buildMemberKey(proposalCandidateAddresses)],
    enabled: isAuthenticated && Boolean(token) && proposalCandidateAddresses.length > 0,
    staleTime: 90_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<BasicProfile[]> => {
      try {
        return await fetchBasicProfilesByAddresses(token, proposalCandidateAddresses);
      } catch {
        const nextToken = await refreshSession();
        return fetchBasicProfilesByAddresses(nextToken, proposalCandidateAddresses);
      }
    },
  });

  const proposalProfileMap = useMemo(() => {
    const map = new Map<string, BasicProfile>();
    for (const profile of proposalProfilesQuery.data ?? []) {
      const normalized = profile.address.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      map.set(normalized, profile);
    }
    return map;
  }, [proposalProfilesQuery.data]);

  const inviteProposals = useMemo(
    () => (membershipProposalsQuery.proposals ?? []).map(proposal => {
      const profile = proposalProfileMap.get(proposal.candidate.toLowerCase());
      return {
        ...proposal,
        candidateUsername: profile?.username ? toUsernameLabel(profile.username) : '',
      };
    }),
    [membershipProposalsQuery.proposals, proposalProfileMap],
  );

  const refreshGroupDetailNow = useCallback(async (options?: { syncChain?: boolean }) => {
    if (options?.syncChain) {
      setSyncWithChain(true);
      await Promise.allSettled([
        membershipProposalsQuery.refetch(),
        memberBidsQuery.refetch(),
        extensionVotesQuery.refetch(),
      ]);
      return;
    }

    await Promise.allSettled([
      overviewQuery.refetch(),
      viewQuery.refetch(),
      membershipProposalsQuery.refetch(),
      memberBidsQuery.refetch(),
      extensionVotesQuery.refetch(),
    ]);
  }, [
    extensionVotesQuery.refetch,
    memberBidsQuery.refetch,
    membershipProposalsQuery.refetch,
    overviewQuery.refetch,
    viewQuery.refetch,
  ]);

  const applySupportRailOptimistic = useCallback((intent: PoolActionIntent) => {
    const poolAddressKey = poolAddress?.toLowerCase() ?? '';
    if (!poolAddressKey) {
      return;
    }

    const viewerAddressKey = viewerAddress?.toLowerCase() ?? '';
    const now = Date.now();
    const quorumMemberCount = Math.max(group?.activeMemberCount ?? 0, 1);
    const requiredYesVotes = requiredTwoThirdsVotes(quorumMemberCount);

    const toBigIntString = (value: unknown): string | null => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return BigInt(Math.trunc(value)).toString();
      }
      if (typeof value === 'string' && value.trim()) {
        try {
          return BigInt(value.trim()).toString();
        } catch {
          return null;
        }
      }
      return null;
    };

    queryClient.setQueryData<InviteProposalView[] | undefined>(
      ['group-membership-proposals', poolAddressKey, viewerAddressKey],
      previous => {
        const proposals = previous ?? [];

        if (intent.actionKey === 'propose_invite') {
          const candidateRaw = intent.args?.[0];
          if (typeof candidateRaw !== 'string' || !isAddress(candidateRaw)) {
            return proposals;
          }

          const candidate = getAddress(candidateRaw);
          const candidateLower = candidate.toLowerCase();
          const existingOpen = proposals.some(
            proposal => proposal.voteMode === 'invite'
              && proposal.open
              && proposal.candidate.toLowerCase() === candidateLower,
          );
          if (existingOpen) {
            return proposals;
          }

          return [
            {
              voteMode: 'invite',
              proposalId: `pending-invite-${candidateLower}-${now}`,
              candidate,
              yesVotes: 0,
              noVotes: 0,
              open: true,
              myVote: null,
              quorumMemberCount,
              requiredYesVotes,
              approvalRatio: 0,
              snapshotEligible: false,
              canVote: false,
            },
            ...proposals,
          ];
        }

        if (intent.actionKey === 'submit_join_request') {
          if (!viewerAddress) {
            return proposals;
          }

          const viewerLower = viewerAddress.toLowerCase();
          const existingOpen = proposals.some(
            proposal => proposal.voteMode === 'join-request'
              && proposal.open
              && proposal.candidate.toLowerCase() === viewerLower,
          );
          if (existingOpen) {
            return proposals;
          }

          return [
            {
              voteMode: 'join-request',
              proposalId: `pending-join-request-${viewerLower}-${now}`,
              candidate: viewerAddress,
              yesVotes: 0,
              noVotes: 0,
              open: true,
              myVote: null,
              quorumMemberCount,
              requiredYesVotes,
              approvalRatio: 0,
              snapshotEligible: false,
              canVote: false,
            },
            ...proposals,
          ];
        }

        if (
          intent.actionKey === 'vote_invite_yes'
          || intent.actionKey === 'vote_invite_no'
          || intent.actionKey === 'vote_join_request_yes'
          || intent.actionKey === 'vote_join_request_no'
        ) {
          const proposalId = toBigIntString(intent.args?.[0]);
          const support = intent.args?.[1];
          if (!proposalId || typeof support !== 'boolean') {
            return proposals;
          }

          return proposals.map(proposal => {
            if (proposal.proposalId !== proposalId) {
              return proposal;
            }

            const nextVote = support ? 'yes' : 'no';
            let yesVotes = proposal.yesVotes;
            let noVotes = proposal.noVotes;

            if (proposal.myVote === null) {
              if (support) {
                yesVotes += 1;
              } else {
                noVotes += 1;
              }
            } else if (proposal.myVote !== nextVote) {
              if (proposal.myVote === 'yes' && yesVotes > 0) {
                yesVotes -= 1;
              } else if (proposal.myVote === 'no' && noVotes > 0) {
                noVotes -= 1;
              }
              if (support) {
                yesVotes += 1;
              } else {
                noVotes += 1;
              }
            }

            const effectiveQuorum = Math.max(proposal.quorumMemberCount, 1);
            const approvalRatio = Math.max(0, Math.min(100, Math.round((yesVotes / effectiveQuorum) * 100)));

            return {
              ...proposal,
              yesVotes,
              noVotes,
              myVote: nextVote,
              approvalRatio,
              canVote: false,
            };
          });
        }

        return proposals;
      },
    );
  }, [group?.activeMemberCount, poolAddress, queryClient, viewerAddress]);

  const applyMembershipAcceptanceOptimistic = useCallback((intent: PoolActionIntent) => {
    if (!viewerAddress) {
      return;
    }
    if (intent.actionKey !== 'accept_join_request' && intent.actionKey !== 'accept_invite') {
      return;
    }

    const viewerAddressLower = viewerAddress.toLowerCase();
    const shouldIncrement = !isViewerMember;

    queryClient.setQueryData<ApiGroup | undefined>(['group-detail', poolId], previous => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        activeMemberCount: shouldIncrement ? previous.activeMemberCount + 1 : previous.activeMemberCount,
      };
    });

    queryClient.setQueryData<ApiGroupDetailView | undefined>(['group-phase-view', poolId], previous => {
      if (!previous) {
        return previous;
      }

      const hasViewer = previous.memberStates.some(member => (
        member.isCurrentUser || member.address.trim().toLowerCase() === viewerAddressLower
      ));

      const nextMemberStates = hasViewer
        ? previous.memberStates.map(member => (
          member.isCurrentUser || member.address.trim().toLowerCase() === viewerAddressLower
            ? {
              ...member,
              isCurrentUser: true,
              isActiveMember: true,
              state: member.state || 'active',
              badge: member.badge || 'Member',
            }
            : member
        ))
        : [
          ...previous.memberStates,
          {
            address: viewerAddress,
            isCurrentUser: true,
            isActiveMember: true,
            state: 'active',
            badge: 'Member',
          },
        ];

      return {
        ...previous,
        group: {
          ...previous.group,
          activeMemberCount: hasViewer ? previous.group.activeMemberCount : previous.group.activeMemberCount + 1,
        },
        memberStates: nextMemberStates,
      };
    });

    const poolAddressKey = poolAddress?.toLowerCase() ?? '';
    if (!poolAddressKey) {
      return;
    }
    const viewerAddressKey = viewerAddressLower;
    const acceptedVoteMode = intent.actionKey === 'accept_join_request' ? 'join-request' : 'invite';

    queryClient.setQueryData<InviteProposalView[] | undefined>(
      ['group-membership-proposals', poolAddressKey, viewerAddressKey],
      previous => {
        if (!previous) {
          return previous;
        }

        return previous.map(proposal => (
          proposal.voteMode === acceptedVoteMode
          && proposal.candidate.toLowerCase() === viewerAddressLower
          && proposal.open
            ? { ...proposal, open: false, canVote: false }
            : proposal
        ));
      },
    );
  }, [isViewerMember, poolAddress, poolId, queryClient, viewerAddress]);

  const handlePoolActionSuccess = useCallback(({ intent }: PoolActionCompletion) => {
    applySupportRailOptimistic(intent);
    applyMembershipAcceptanceOptimistic(intent);
    void refreshGroupDetailNow({ syncChain: true });
  }, [
    applySupportRailOptimistic,
    applyMembershipAcceptanceOptimistic,
    refreshGroupDetailNow,
  ]);

  const poolActionWallet = usePoolActionWallet({
    token,
    poolAddress,
    expectedAccountAddress: viewerAddress,
    onActionSuccess: handlePoolActionSuccess,
  });

  const [inputError, setInputError] = useState('');
  const [toasts, setToasts] = useState<UiToast[]>([]);
  const toastCounterRef = useRef(1);
  const lastActionMessageRef = useRef('');
  const lastActionErrorRef = useRef('');

  const dismissToast = useCallback((id: number) => {
    setToasts(previous => previous.filter(item => item.id !== id));
  }, []);

  const pushToast = useCallback((tone: UiToast['tone'], message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const id = toastCounterRef.current;
    toastCounterRef.current += 1;
    setToasts(previous => [...previous, { id, tone, message: trimmed }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts(previous => previous.filter(item => item.id !== id));
      }, 5000);
    }
  }, []);

  useEffect(() => {
    const message = poolActionWallet.actionMessage.trim();
    if (!message || message === lastActionMessageRef.current) {
      return;
    }
    lastActionMessageRef.current = message;
    pushToast('success', message);
  }, [poolActionWallet.actionMessage, pushToast]);

  useEffect(() => {
    const message = poolActionWallet.actionError.trim();
    if (!message || message === lastActionErrorRef.current) {
      return;
    }
    lastActionErrorRef.current = message;
    pushToast('error', message);
  }, [poolActionWallet.actionError, pushToast]);

  const triggerAction = useCallback((intent: PoolActionIntent) => {
    setInputError('');
    poolActionWallet.startAction(intent);
  }, [poolActionWallet]);

  const [bidDiscountInput, setBidDiscountInputState] = useState('');

  const contributionLabel = useMemo(() => formatToken(group?.contributionAmount ?? '0'), [group?.contributionAmount]);
  const payoutAmountRaw = useMemo(
    () => derivePayoutAmount(phaseView?.periodMeta),
    [phaseView?.periodMeta],
  );
  const periodMeta = useMemo(() => {
    if (!phaseView?.periodMeta) {
      return undefined;
    }
    return {
      ...phaseView.periodMeta,
      payoutAmount: payoutAmountRaw,
    };
  }, [phaseView?.periodMeta, payoutAmountRaw]);

  const totalPayoutLabel = useMemo(() => {
    try {
      if (BigInt(payoutAmountRaw) > 0n) {
        return formatToken(payoutAmountRaw);
      }
    } catch {
      // Ignore parse errors and fall back to contribution-based estimate.
    }

    try {
      const contribution = BigInt(group?.contributionAmount ?? '0');
      const memberCount = BigInt(Math.max(group?.activeMemberCount ?? 0, 1));
      return formatToken((contribution * memberCount).toString());
    } catch {
      return formatToken('0');
    }
  }, [group?.activeMemberCount, group?.contributionAmount, payoutAmountRaw]);

  const claimableYieldLabel = useMemo(
    () => formatToken(phaseView?.userClaimState.claimableYield ?? '0'),
    [phaseView?.userClaimState.claimableYield],
  );
  const fundingProgressHint = useMemo(() => {
    const runtime = phaseView?.runtime;
    const phaseMeta = phaseView?.phaseMeta;
    if (!runtime || !phaseMeta) {
      return '';
    }
    if (activePhase !== 'funding' || groupStatus !== 'funding') {
      return '';
    }
    if (phaseMeta.phaseStatus !== 'active') {
      return '';
    }
    if (!runtime.allActiveContributed) {
      return '';
    }
    if (phaseMeta.countdownSeconds <= 0) {
      return '';
    }
    return 'All contributions received. Bidding opens when funding timer ends.';
  }, [
    activePhase,
    groupStatus,
    phaseView?.phaseMeta,
    phaseView?.runtime,
  ]);

  const viewerLower = viewerAddress?.toLowerCase() ?? '';
  const viewerReadyMembershipProposal = useMemo(
    () => inviteProposals.find(
      proposal =>
        proposal.open
        && proposal.yesVotes >= proposal.requiredYesVotes
        && Boolean(viewerLower)
        && proposal.candidate.toLowerCase() === viewerLower,
    ) ?? null,
    [inviteProposals, viewerLower],
  );
  const viewerOpenJoinRequest = useMemo(
    () => inviteProposals.find(
      proposal =>
        proposal.voteMode === 'join-request'
        && proposal.open
        && Boolean(viewerLower)
        && proposal.candidate.toLowerCase() === viewerLower,
    ) ?? null,
    [inviteProposals, viewerLower],
  );
  const viewerOpenInvite = useMemo(
    () => inviteProposals.find(
      proposal =>
        proposal.voteMode === 'invite'
        && proposal.open
        && Boolean(viewerLower)
        && proposal.candidate.toLowerCase() === viewerLower,
    ) ?? null,
    [inviteProposals, viewerLower],
  );
  const canRequestJoin = permissionView.canRequestJoin && !viewerOpenJoinRequest && !viewerOpenInvite;
  const requestJoinDisabledReason = viewerOpenJoinRequest
    ? `You already submitted join request #${viewerOpenJoinRequest.proposalId}. Wait for member votes before retrying.`
    : viewerOpenInvite
      ? `You already have an active invite #${viewerOpenInvite.proposalId}. Confirm it in Forming workspace instead of creating a join request.`
      : permissionView.disabledReason;
  const canConfirmJoin = !isViewerMember && Boolean(viewerReadyMembershipProposal);
  const confirmJoinLabel = viewerReadyMembershipProposal
    ? viewerReadyMembershipProposal.voteMode === 'invite'
      ? `Confirm invite #${viewerReadyMembershipProposal.proposalId}`
      : `Confirm request #${viewerReadyMembershipProposal.proposalId}`
    : 'Confirm to Join';

  const onContribute = useCallback(() => {
    triggerAction({ actionKey: 'contribute', label: 'contribute', functionName: 'contribute' });
  }, [triggerAction]);

  const onSubmitBid = useCallback(() => {
    try {
      setInputError('');
      if (activePeriodForBids >= totalPeriods) {
        throw new Error('Bidding is disabled in the final period.');
      }
      const discount = parseTokenAmountInput(bidDiscountInput, 'Bid discount');
      const currentBestDiscount = (() => {
        try {
          return BigInt(phaseView?.periodMeta.bestDiscount ?? '0');
        } catch {
          return 0n;
        }
      })();
      if (discount <= currentBestDiscount) {
        throw new Error(
          `Bid discount must be greater than current best discount (${formatToken(currentBestDiscount.toString())}).`,
        );
      }

      const totalContributed = (() => {
        try {
          return BigInt(phaseView?.periodMeta.totalContributed ?? '0');
        } catch {
          return 0n;
        }
      })();
      if (totalContributed > 0n && discount >= totalContributed) {
        throw new Error(
          `Bid discount must be lower than total contributed (${formatToken(totalContributed.toString())}).`,
        );
      }

      triggerAction({
        actionKey: 'submit_discount_bid',
        label: 'submit discount bid',
        functionName: 'submitDiscountBid',
        args: [discount],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bid discount is invalid.';
      setInputError(message);
    }
  }, [
    bidDiscountInput,
    phaseView?.periodMeta.bestDiscount,
    phaseView?.periodMeta.totalContributed,
    activePeriodForBids,
    totalPeriods,
    triggerAction,
  ]);

  const onClaimPayout = useCallback(() => {
    triggerAction({ actionKey: 'claim_payout', label: 'claim payout', functionName: 'claimPayout' });
  }, [triggerAction]);

  const onFinalizePeriod = useCallback(() => {
    triggerAction({ actionKey: 'sync_runtime_after_payout', label: 'sync runtime', functionName: 'syncRuntime' });
  }, [triggerAction]);

  const onVoteContinue = useCallback(() => {
    triggerAction({
      actionKey: 'vote_extend_continue',
      label: 'vote continue',
      functionName: 'voteExtendCycle',
      args: [true],
    });
  }, [triggerAction]);

  const onVoteEnd = useCallback(() => {
    triggerAction({
      actionKey: 'vote_extend_end',
      label: 'vote end',
      functionName: 'voteExtendCycle',
      args: [false],
    });
  }, [triggerAction]);

  const onClaimYield = useCallback(() => {
    triggerAction({ actionKey: 'claim_yield', label: 'claim yield', functionName: 'claimYield' });
  }, [triggerAction]);

  const onRequestJoin = useCallback(() => {
    if (!canRequestJoin) {
      setInputError(requestJoinDisabledReason || 'Join request is unavailable for this group.');
      return;
    }
    triggerAction({
      actionKey: 'submit_join_request',
      label: 'request to join',
      functionName: 'submitJoinRequest',
    });
  }, [canRequestJoin, requestJoinDisabledReason, triggerAction]);

  const onProposeInvite = useCallback((candidate: string) => {
    if (!canProposeInvite) {
      setInputError('Invite proposal is only available while group is forming.');
      return;
    }

    void (async () => {
      const trimmed = candidate.trim();
      if (!trimmed) {
        setInputError('Candidate is required.');
        return;
      }

      let resolvedCandidate: Address | null = null;
      if (isAddress(trimmed)) {
        resolvedCandidate = getAddress(trimmed);
      } else {
        const initResolved = fromInitAddress(trimmed);
        if (initResolved && isAddress(initResolved)) {
          resolvedCandidate = getAddress(initResolved);
        }
      }

      if (!resolvedCandidate) {
        const normalizedUsername = normalizeCandidateUsername(trimmed);
        if (!normalizedUsername) {
          setInputError('Candidate must be a wallet, init address, or username.');
          return;
        }

        if (!token) {
          setInputError('Missing auth token. Please reconnect and try again.');
          return;
        }

        let profiles: BasicProfile[] = [];
        try {
          profiles = await fetchBasicProfilesByUsernames(token, [normalizedUsername]);
        } catch {
          try {
            const nextToken = await refreshSession();
            profiles = await fetchBasicProfilesByUsernames(nextToken, [normalizedUsername]);
          } catch {
            setInputError('Cannot resolve username right now. Please try again.');
            return;
          }
        }

        const matchedProfile = profiles.find(profile => {
          const profileUsername = normalizeCandidateUsername(profile.username);
          return profileUsername === normalizedUsername;
        }) ?? profiles[0];

        const resolvedAddress = matchedProfile?.address?.trim() ?? '';
        if (!matchedProfile || !resolvedAddress || !isAddress(resolvedAddress)) {
          setInputError('Username not found or has no linked wallet.');
          return;
        }
        resolvedCandidate = getAddress(resolvedAddress);
      }

      if (viewerAddress && resolvedCandidate.toLowerCase() === viewerAddress.toLowerCase()) {
        setInputError('You cannot invite your own wallet.');
        return;
      }

      triggerAction({
        actionKey: 'propose_invite',
        label: 'propose invite',
        functionName: 'proposeInvite',
        args: [resolvedCandidate],
      });
      setCandidateAddressState('');
    })();
  }, [canProposeInvite, refreshSession, token, triggerAction, viewerAddress]);

  const onLeaveDuringForming = useCallback(() => {
    if (!canLeaveDuringForming) {
      setInputError('Out group is only available while group is forming.');
      return;
    }
    triggerAction({
      actionKey: 'leave_during_forming',
      label: 'leave group',
      functionName: 'leaveDuringForming',
    });
  }, [canLeaveDuringForming, triggerAction]);

  const onVoteProposal = useCallback((proposalId: string, voteMode: MembershipVoteMode, support: boolean) => {
    triggerAction(
      voteMode === 'invite'
        ? {
          actionKey: support ? 'vote_invite_yes' : 'vote_invite_no',
          label: support ? 'vote invite yes' : 'vote invite no',
          functionName: 'voteInvite',
          args: [BigInt(proposalId), support],
        }
        : {
          actionKey: support ? 'vote_join_request_yes' : 'vote_join_request_no',
          label: support ? 'vote join request yes' : 'vote join request no',
          functionName: 'voteJoinRequest',
          args: [BigInt(proposalId), support],
        },
    );
  }, [triggerAction]);

  const onAcceptMembershipProposal = useCallback((proposalId: string, voteMode: MembershipVoteMode) => {
    if (!viewerAddress) {
      setInputError('Wallet address is missing. Please reconnect and try again.');
      return;
    }
    if (groupStatus !== 'forming') {
      setInputError('Membership acceptance is only available while group is forming.');
      return;
    }

    const proposal = membershipProposalsQuery.proposals.find(
      item => item.proposalId === proposalId && item.voteMode === voteMode,
    );
    if (!proposal) {
      setInputError('Membership proposal not found. Please refresh and retry.');
      return;
    }
    if (!proposal.open) {
      setInputError('Membership proposal is already closed.');
      return;
    }
    if (proposal.candidate.toLowerCase() !== viewerAddress.toLowerCase()) {
      setInputError('Only the selected wallet can accept this membership proposal.');
      return;
    }
    if (proposal.yesVotes < proposal.requiredYesVotes) {
      setInputError('Approval threshold has not reached 2/3 yet.');
      return;
    }

    triggerAction(
      voteMode === 'invite'
        ? {
          actionKey: 'accept_invite',
          label: 'accept invite',
          functionName: 'acceptInvite',
          args: [BigInt(proposalId)],
        }
        : {
          actionKey: 'accept_join_request',
          label: 'accept join request',
          functionName: 'acceptJoinRequest',
          args: [BigInt(proposalId)],
        },
    );
  }, [groupStatus, membershipProposalsQuery.proposals, triggerAction, viewerAddress]);

  const onConfirmJoin = useCallback(() => {
    if (!viewerReadyMembershipProposal) {
      setInputError('No approved invite/request found for your wallet yet.');
      return;
    }
    onAcceptMembershipProposal(viewerReadyMembershipProposal.proposalId, viewerReadyMembershipProposal.voteMode);
  }, [onAcceptMembershipProposal, viewerReadyMembershipProposal]);

  const setBidDiscountInput = useCallback((value: string) => {
    setInputError('');
    setBidDiscountInputState(value);
  }, []);

  const setCandidateAddress = useCallback((value: string) => {
    setInputError('');
    setCandidateAddressState(value);
  }, []);

  const isLoading = (overviewQuery.isLoading && !group) || (viewQuery.isLoading && !phaseView);
  const isRefreshing = overviewQuery.isFetching || viewQuery.isFetching;
  const error = overviewQuery.error instanceof Error
    ? overviewQuery.error.message
    : viewQuery.error instanceof Error
      ? viewQuery.error.message
      : '';

  const onRefresh = useCallback(() => {
    void refreshGroupDetailNow();
  }, [refreshGroupDetailNow]);

  const hasReachedFormingTarget = groupStatus === 'forming'
    && (group?.activeMemberCount ?? 0) >= Math.max(group?.targetMembers ?? 0, 1);

  useEffect(() => {
    if (!hasReachedFormingTarget || poolActionWallet.isActing) {
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    void refreshGroupDetailNow();

    const timer = window.setInterval(() => {
      if (!isDocumentVisible()) {
        return;
      }
      void refreshGroupDetailNow();
    }, 2_500);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasReachedFormingTarget, poolActionWallet.isActing, refreshGroupDetailNow]);

  useEffect(() => {
    if (!isAuthenticated || !token || poolActionWallet.isActing) {
      return;
    }
    if (!phaseView || typeof window === 'undefined') {
      return;
    }
    if (chainSyncInFlightRef.current || syncWithChain) {
      return;
    }

    const runtime = phaseView.runtime;
    const phaseMeta = phaseView.phaseMeta;
    const selection = phaseView.selection;
    if (!runtime || !phaseMeta || !selection) {
      return;
    }
    if (phaseMeta.phaseStatus !== 'active') {
      return;
    }

    let shouldSyncAtDeadline = false;
    if (selection.activePhase === 'funding') {
      shouldSyncAtDeadline = runtime.allActiveContributed;
    } else if (selection.activePhase === 'bidding' || selection.activePhase === 'payout') {
      shouldSyncAtDeadline = true;
    } else if (selection.activePhase === 'ending' && groupStatus === 'voting_extension') {
      shouldSyncAtDeadline = true;
    }
    if (!shouldSyncAtDeadline) {
      return;
    }

    const guardKey = `${selection.cycle}:${selection.activePeriod}:${selection.activePhase}`;
    const countdownSeconds = Math.max(0, Math.floor(phaseMeta.countdownSeconds ?? 0));

    if (countdownSeconds > 0 && countdownSeconds <= 3 && nearDeadlineSyncKeyRef.current !== guardKey) {
      nearDeadlineSyncKeyRef.current = guardKey;
      setSyncWithChain(true);
    }

    if (countdownSeconds <= 0 && postDeadlineSyncKeyRef.current !== guardKey) {
      postDeadlineSyncKeyRef.current = guardKey;
      if (postDeadlineTimerRef.current !== null) {
        window.clearTimeout(postDeadlineTimerRef.current);
      }
      postDeadlineTimerRef.current = window.setTimeout(() => {
        setSyncWithChain(true);
        postDeadlineTimerRef.current = null;
      }, 2_000);
    }
  }, [
    groupStatus,
    isAuthenticated,
    phaseView,
    poolActionWallet.isActing,
    syncWithChain,
    token,
  ]);

  useEffect(() => {
    if (!phaseView || poolActionWallet.isActing || syncWithChain) {
      return;
    }

    const expectedPhaseByStatus: Record<string, string> = {
      funding: 'funding',
      bidding: 'bidding',
      payout: 'payout',
      deadlinepassed: 'ending',
      ended_period: 'ending',
      voting_extension: 'ending',
      archived: 'ending',
    };

    const expectedPhase = expectedPhaseByStatus[groupStatus];
    if (!expectedPhase) {
      return;
    }

    const activePhaseFromView = phaseView.selection?.activePhase?.trim().toLowerCase() ?? '';
    if (!activePhaseFromView || activePhaseFromView === expectedPhase) {
      return;
    }

    const mismatchKey = `${phaseView.selection.cycle}:${phaseView.selection.activePeriod}:${expectedPhase}:${activePhaseFromView}`;
    if (phaseMismatchSyncKeyRef.current === mismatchKey) {
      return;
    }

    phaseMismatchSyncKeyRef.current = mismatchKey;
    setSyncWithChain(true);
  }, [groupStatus, phaseView, poolActionWallet.isActing, syncWithChain]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refreshWhenVisible = () => {
      if (!isDocumentVisible()) {
        return;
      }
      onRefresh();
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isAuthenticated, onRefresh, token]);

  const selection = phaseView?.selection;

  return {
    isAuthenticated,
    isLoading,
    isRefreshing,
    error,
    group,
    groupStatus,
    totalPeriods,
    activePeriod,
    activePhase,
    selection,
    periodMeta,
    phaseMeta: phaseView?.phaseMeta,
    runtime: phaseView?.runtime,
    historyRows: phaseView?.historyRows ?? [],
    memberStates: phaseView?.memberStates ?? [],
    memberPhaseViews,
    contributionLabel,
    totalPayoutLabel,
    claimableYieldLabel,
    phaseHintMessage: fundingProgressHint,
    membersLabel: `${group?.activeMemberCount ?? 0}/${Math.max(group?.targetMembers ?? totalPeriods, 1)}`,
    currentCycle: Number.parseInt(group?.currentCycle ?? '1', 10) || 1,
    viewerAddress,
    isConnected: Boolean(token),
    inviteProposals,
    candidateAddress,
    setCandidateAddress,
    canProposeInvite,
    canLeaveDuringForming,
    canConfirmJoin,
    confirmJoinLabel,
    canRequestJoin,
    requestJoinDisabledReason,
    bidDiscountInput,
    setBidDiscountInput,
    inputError,
    toasts,
    dismissToast,
    permissions: permissionView,
    isViewerMember,
    isViewerActiveMember,
    onRefresh,
    onContribute,
    onSubmitBid,
    onClaimPayout,
    onFinalizePeriod,
    onVoteContinue,
    onVoteEnd,
    onClaimYield,
    onRequestJoin,
    onConfirmJoin,
    onProposeInvite,
    onLeaveDuringForming,
    onVoteProposal,
    onAcceptMembershipProposal,
    poolAction: poolActionWallet,
  };
}

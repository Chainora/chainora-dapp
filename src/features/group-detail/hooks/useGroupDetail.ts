import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAddress, isAddress, parseAbiItem, type Address } from 'viem';
import { usePublicClient } from 'wagmi';

import { fromInitAddress, toInitAddress } from '../../../components/UserDetail';
import type { MembershipVoteMode } from '../../../components/group-detail/types';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchBasicProfilesByAddresses,
  fetchBasicProfilesByUsernames,
  type BasicProfile,
} from '../../../services/profileService';
import {
  type ApiGroup,
  type ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import { formatInitCompact, formatToken, parseUintInput, toUsernameLabel } from '../utils';
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
import { type PoolActionIntent, usePoolActionQr } from './usePoolActionQr';
import { useGroupMembershipProposals } from './useGroupMembershipProposals';
import type { MemberPhaseView } from '../components/MemberStatePanel';

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

  const overviewQuery = useGroupOverviewQuery({
    poolId,
    accessToken: token,
    refreshSession,
    enabled: isAuthenticated && Boolean(token),
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
  });

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
    isViewerMember,
  });

  const invalidateAfterAction = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['group-detail', poolId] }),
      queryClient.invalidateQueries({ queryKey: ['group-phase-view', poolId] }),
      queryClient.invalidateQueries({ queryKey: ['group-membership-proposals'] }),
    ]);
  }, [poolId, queryClient]);

  const poolAddress = useMemo(() => {
    const raw = group?.poolAddress?.trim() ?? '';
    if (!raw || !isAddress(raw)) {
      return null;
    }
    return getAddress(raw);
  }, [group?.poolAddress]);

  const selectedCycleForBids = useMemo(() => {
    if (phaseView?.selection.cycle && phaseView.selection.cycle > 0) {
      return phaseView.selection.cycle;
    }
    try {
      const parsed = Number(group?.currentCycle ?? '1');
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    } catch {
      return 1;
    }
  }, [group?.currentCycle, phaseView?.selection.cycle]);

  const selectedPeriodForBids = useMemo(() => {
    if (phaseView?.selection.period && phaseView.selection.period > 0) {
      return phaseView.selection.period;
    }
    return activePeriod > 0 ? activePeriod : 1;
  }, [activePeriod, phaseView?.selection.period]);

  const selectedPhaseForBids = phaseView?.selection.phase ?? activePhase;

  const memberBidsQuery = useQuery({
    queryKey: ['group-member-bids', poolId, poolAddress?.toLowerCase() ?? '', selectedCycleForBids, selectedPeriodForBids],
    enabled:
      Boolean(publicClient)
      && Boolean(poolAddress)
      && selectedPhaseForBids === 'bidding'
      && selectedCycleForBids > 0
      && selectedPeriodForBids > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<Record<string, string>> => {
      if (!publicClient || !poolAddress) {
        return {};
      }

      const cycleId = BigInt(selectedCycleForBids);
      const periodId = BigInt(selectedPeriodForBids);
      const logs = await publicClient.getLogs({
        address: poolAddress,
        event: CHAINORA_BID_SUBMITTED_EVENT,
        args: { cycleId, periodId },
      });

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
      selectedCycleForBids,
      selectedPeriodForBids,
    ],
    enabled:
      Boolean(publicClient)
      && Boolean(poolAddress)
      && groupStatus === 'voting_extension'
      && selectedPhaseForBids === 'ending'
      && selectedCycleForBids > 0
      && selectedPeriodForBids > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<Record<string, 'continue' | 'end'>> => {
      if (!publicClient || !poolAddress) {
        return {};
      }

      const cycleId = BigInt(selectedCycleForBids);
      const periodId = BigInt(selectedPeriodForBids);
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
      const bidAmountRaw = selectedPhaseForBids === 'bidding'
        ? memberBids[normalizedAddress] ?? null
        : null;
      let state = member.state;
      let badge = member.badge;
      if (groupStatus === 'voting_extension' && selectedPhaseForBids === 'ending') {
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
      } else if (selectedPhaseForBids === 'ending' && member.state === 'pending_finalize') {
        if (hasRecipient && normalizedAddress === recipientLower) {
          badge = `Claimer period ${selectedPeriodForBids}`;
        } else {
          badge = '';
        }
      }

      return {
        address: member.address,
        displayLabel,
        secondaryLabel: initAddress,
        avatarUrl: profile?.avatarUrl || '',
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
    selectedPeriodForBids,
    selectedPhaseForBids,
  ]);

  const canProposeInvite = groupStatus === 'forming' && isViewerActiveMember;
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

  const handlePoolActionSuccess = useCallback(() => {
    void invalidateAfterAction();
  }, [invalidateAfterAction]);

  const poolActionQr = usePoolActionQr({
    token,
    poolAddress,
    onActionSuccess: handlePoolActionSuccess,
  });

  const [inputError, setInputError] = useState('');

  const triggerAction = useCallback((intent: PoolActionIntent) => {
    setInputError('');
    poolActionQr.startAction(intent);
  }, [poolActionQr]);

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
      const discount = parseUintInput(bidDiscountInput, 'Bid discount');
      const currentBestDiscount = (() => {
        try {
          return BigInt(phaseView?.periodMeta.bestDiscount ?? '0');
        } catch {
          return 0n;
        }
      })();
      if (discount <= currentBestDiscount) {
        throw new Error(
          `Bid discount must be greater than current best discount (${currentBestDiscount.toString()}).`,
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
          `Bid discount must be lower than total contributed (${totalContributed.toString()}).`,
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
  }, [bidDiscountInput, phaseView?.periodMeta.bestDiscount, phaseView?.periodMeta.totalContributed, triggerAction]);

  const onCloseAuction = useCallback(() => {
    triggerAction({
      actionKey: 'close_auction_and_select',
      label: 'close auction',
      functionName: 'closeAuctionAndSelectRecipient',
    });
  }, [triggerAction]);

  const onClaimPayout = useCallback(() => {
    triggerAction({ actionKey: 'claim_payout', label: 'claim payout', functionName: 'claimPayout' });
  }, [triggerAction]);

  const onFinalizePeriod = useCallback(() => {
    triggerAction({ actionKey: 'finalize_period', label: 'finalize period', functionName: 'finalizePeriod' });
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
    void overviewQuery.refetch();
    void viewQuery.refetch();
    void membershipProposalsQuery.refetch();
  }, [membershipProposalsQuery.refetch, overviewQuery.refetch, viewQuery.refetch]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (!isDocumentVisible()) {
        return;
      }
      onRefresh();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, onRefresh, token]);

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
    memberStates: phaseView?.memberStates ?? [],
    memberPhaseViews,
    contributionLabel,
    totalPayoutLabel,
    claimableYieldLabel,
    membersLabel: `${group?.activeMemberCount ?? 0}/${Math.max(group?.targetMembers ?? totalPeriods, 1)}`,
    currentCycle: Number.parseInt(group?.currentCycle ?? '1', 10) || 1,
    viewerAddress,
    isConnected: Boolean(token),
    inviteProposals,
    candidateAddress,
    setCandidateAddress,
    canProposeInvite,
    canConfirmJoin,
    confirmJoinLabel,
    canRequestJoin,
    requestJoinDisabledReason,
    bidDiscountInput,
    setBidDiscountInput,
    inputError,
    permissions: permissionView,
    isViewerMember,
    isViewerActiveMember,
    onRefresh,
    onContribute,
    onSubmitBid,
    onCloseAuction,
    onClaimPayout,
    onFinalizePeriod,
    onVoteContinue,
    onVoteEnd,
    onClaimYield,
    onRequestJoin,
    onConfirmJoin,
    onProposeInvite,
    onVoteProposal,
    onAcceptMembershipProposal,
    poolAction: poolActionQr,
  };
}

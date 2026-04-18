import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAddress, isAddress, type Address } from 'viem';
import { usePublicClient } from 'wagmi';

import { fromInitAddress, toInitAddress } from '../../../components/UserDetail';
import type { MembershipVoteMode } from '../../../components/group-detail/types';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchBasicProfilesByAddresses,
  type BasicProfile,
} from '../../../services/profileService';
import {
  type ApiGroup,
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

type GroupDetailProps = {
  poolId: string;
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
  const activeSelectionHint = false;

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

  const memberPhaseViews = useMemo<MemberPhaseView[]>(() => {
    const states = phaseView?.memberStates ?? [];
    return states.map(member => {
      const normalizedAddress = member.address.trim().toLowerCase();
      const profile = profileMap.get(normalizedAddress);
      const initAddress = toInitAddress(member.address) || member.address;
      const displayLabel = profile?.username
        ? toUsernameLabel(profile.username)
        : formatInitCompact(initAddress);

      return {
        address: member.address,
        displayLabel,
        secondaryLabel: initAddress,
        avatarUrl: profile?.avatarUrl || '',
        state: member.state,
        badge: member.badge,
        isCurrentUser: Boolean(member.isCurrentUser),
      };
    });
  }, [phaseView?.memberStates, profileMap]);

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

  const totalPayoutLabel = useMemo(() => {
    if (phaseView?.periodMeta.payoutAmount) {
      return formatToken(phaseView.periodMeta.payoutAmount);
    }

    try {
      const contribution = BigInt(group?.contributionAmount ?? '0');
      const memberCount = BigInt(Math.max(group?.activeMemberCount ?? 0, 1));
      return formatToken((contribution * memberCount).toString());
    } catch {
      return formatToken('0');
    }
  }, [group?.activeMemberCount, group?.contributionAmount, phaseView?.periodMeta.payoutAmount]);

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
  const canRequestJoin = permissionView.canRequestJoin && !viewerOpenJoinRequest;
  const requestJoinDisabledReason = viewerOpenJoinRequest
    ? `You already submitted join request #${viewerOpenJoinRequest.proposalId}. Wait for member votes before retrying.`
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
  }, [bidDiscountInput, triggerAction]);

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

    const trimmed = candidate.trim();
    const resolvedCandidate = isAddress(trimmed) ? getAddress(trimmed) : fromInitAddress(trimmed);
    if (!resolvedCandidate) {
      setInputError('Candidate address is invalid.');
      return;
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
  }, [canProposeInvite, triggerAction, viewerAddress]);

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
  }, [membershipProposalsQuery, overviewQuery, viewQuery]);

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
    periodMeta: phaseView?.periodMeta,
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

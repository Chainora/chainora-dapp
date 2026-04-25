import { formatUnits, parseUnits } from 'viem';

import type { InviteProposalView } from '../../components/group-detail/types';
import type { ApiGroup } from '../../services/groupsService';
import type {
  OnchainPoolSnapshot,
  PeriodRoundSnapshot,
  PoolDiscoverySnapshot,
  RefreshOptions,
} from './types';

export const CONTRIBUTION_SYMBOL =
  (import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL as string | undefined) || 'tcUSD';

export const mergeRefreshOptions = (base?: RefreshOptions | null, next?: RefreshOptions): RefreshOptions => ({
  forceSync: Boolean(base?.forceSync || next?.forceSync),
  includeHeavy: Boolean(base?.includeHeavy || next?.includeHeavy),
});

export const toStatusLabel = (status: number): string => {
  switch (status) {
    case 0:
      return 'Forming';
    case 1:
      return 'Active';
    case 2:
      return 'Archived';
    default:
      return 'Unknown';
  }
};

export const toPeriodStatusLabel = (status: number): string => {
  switch (status) {
    case 0:
      return 'Collecting contributions';
    case 1:
      return 'Auction open';
    case 2:
      return 'Recipient selected';
    case 3:
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const toStatusPill = (status: number): string => {
  switch (status) {
    case 0:
      return 'chip chip-warn';
    case 1:
      return 'chip chip-ok';
    case 2:
      return 'chip';
    default:
      return 'chip';
  }
};

export const formatToken = (raw: string): string => {
  try {
    const value = formatUnits(BigInt(raw), 18);
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return `${asNumber.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${CONTRIBUTION_SYMBOL}`;
    }
    return `${value} ${CONTRIBUTION_SYMBOL}`;
  } catch {
    return `0 ${CONTRIBUTION_SYMBOL}`;
  }
};

export const formatAddress = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 14) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
};

export const formatInitCompact = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= 22) {
    return trimmed;
  }
  return `${trimmed.slice(0, 11)}...${trimmed.slice(-6)}`;
};

export const requiredTwoThirdsVotes = (total: number): number => {
  const quorum = Math.max(total, 1);
  return Math.ceil((quorum * 2) / 3);
};

export const notNull = <T,>(value: T | null): value is T => value !== null;

export const toUsernameLabel = (username: string): string => {
  const trimmed = username.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('.init') ? trimmed : `${trimmed}.init`;
};

export const mapPoolActionStatusMessage = (status: string): string => {
  switch (status) {
    case 'connecting':
      return 'Connecting wallet session...';
    case 'awaiting_wallet_approval':
      return 'Preparing transaction...';
    case 'awaiting_card':
      return 'Approve and sign in native app with your card.';
    case 'broadcasting':
      return 'Broadcasting transaction and waiting for confirmation...';
    case 'confirmed':
      return 'Done. Action completed successfully.';
    case 'attest_required':
      return 'Device verification required before this action.';
    case 'error':
      return 'Could not complete this action. Please try again.';
    default:
      return 'Ready to sign this action.';
  }
};

export const toPoolActionToastMessage = (actionKey: string, fallbackLabel: string): string => {
  switch (actionKey) {
    case 'propose_invite':
      return 'Invite proposal submitted.';
    case 'submit_join_request':
      return 'Join request submitted.';
    case 'vote_invite_yes':
    case 'vote_invite_no':
      return 'Invite vote submitted.';
    case 'vote_join_request_yes':
    case 'vote_join_request_no':
      return 'Join request vote submitted.';
    case 'accept_invite':
      return 'Invite accepted. You are now joining this group.';
    case 'accept_join_request':
      return 'Join request accepted. You are now joining this group.';
    case 'leave_during_forming':
      return 'Leave group submitted.';
    default:
      return `${fallbackLabel} submitted.`;
  }
};

export const parseUintInput = (value: string, field: string): bigint => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return BigInt(trimmed);
};

export const parseTokenAmountInput = (
  value: string,
  field: string,
  decimals = 18,
): bigint => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`${field} must be a non-negative number`);
  }

  try {
    const parsed = parseUnits(trimmed, decimals);
    if (parsed < 0n) {
      throw new Error(`${field} must be a non-negative number`);
    }
    return parsed;
  } catch {
    throw new Error(`${field} has invalid decimal precision`);
  }
};

export const toInt = (value: unknown): number => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const toBigIntString = (value: unknown): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.floor(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? '0' : trimmed;
  }
  return '0';
};

export const toBigIntValue = (value: unknown, fallback: bigint = 0n): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    try {
      return BigInt(trimmed);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const parsePeriodInfo = (raw: unknown): PeriodRoundSnapshot => {
  const source = (raw as Record<string, unknown>) || {};
  const tuple = Array.isArray(raw) ? raw : [];
  const read = (key: string, index: number): unknown => source[key] ?? tuple[index];

  return {
    status: toInt(read('status', 0)),
    recipient: String(read('recipient', 4) ?? ''),
    bestBidder: String(read('bestBidder', 5) ?? ''),
    bestDiscount: toBigIntString(read('bestDiscount', 6)),
    totalContributed: toBigIntString(read('totalContributed', 7)),
    payoutAmount: toBigIntString(read('payoutAmount', 8)),
    payoutClaimed: Boolean(read('payoutClaimed', 9)),
  };
};

export const parseInviteProposal = (raw: unknown): { candidate: string; yesVotes: number; noVotes: number; open: boolean } => {
  const source = (raw as Record<string, unknown>) || {};
  const tuple = Array.isArray(raw) ? raw : [];
  const read = (key: string, index: number): unknown => source[key] ?? tuple[index];

  return {
    candidate: String(read('candidate', 0) ?? ''),
    yesVotes: toInt(read('yesVotes', 1)),
    noVotes: toInt(read('noVotes', 2)),
    open: Boolean(read('open', 3)),
  };
};

export const parseJoinRequest = (raw: unknown): { applicant: string; yesVotes: number; noVotes: number; open: boolean } => {
  const source = (raw as Record<string, unknown>) || {};
  const tuple = Array.isArray(raw) ? raw : [];
  const read = (key: string, index: number): unknown => source[key] ?? tuple[index];

  return {
    applicant: String(read('applicant', 0) ?? ''),
    yesVotes: toInt(read('yesVotes', 1)),
    noVotes: toInt(read('noVotes', 2)),
    open: Boolean(read('open', 3)),
  };
};

export const secondsLabel = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(0, seconds)}s`;
};

const areMembersEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i].toLowerCase() !== right[i].toLowerCase()) {
      return false;
    }
  }

  return true;
};

export const isSameGroup = (left: ApiGroup | null, right: ApiGroup | null): boolean => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.poolId === right.poolId
    && left.poolAddress === right.poolAddress
    && left.updatedAt === right.updatedAt
    && left.status === right.status
    && left.currentCycle === right.currentCycle
    && left.currentPeriod === right.currentPeriod
    && left.activeMemberCount === right.activeMemberCount
    && left.publicRecruitment === right.publicRecruitment
    && left.targetMembers === right.targetMembers
    && left.contributionAmount === right.contributionAmount
    && left.name === right.name
    && left.description === right.description
    && left.groupImageUrl === right.groupImageUrl
  );
};

export const isSameOnchain = (left: OnchainPoolSnapshot | null, right: OnchainPoolSnapshot | null): boolean => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.creator.toLowerCase() === right.creator.toLowerCase()
    && left.poolStatus === right.poolStatus
    && left.publicRecruitment === right.publicRecruitment
    && left.targetMembers === right.targetMembers
    && left.minReputation === right.minReputation
    && left.activeMemberCount === right.activeMemberCount
    && left.currentCycle === right.currentCycle
    && left.currentPeriod === right.currentPeriod
    && left.cycleCompleted === right.cycleCompleted
    && left.extendVoteOpen === right.extendVoteOpen
    && left.extendVoteRound === right.extendVoteRound
    && left.extendYesVotes === right.extendYesVotes
    && left.extendRequiredVotes === right.extendRequiredVotes
    && left.periodDuration === right.periodDuration
    && left.contributionWindow === right.contributionWindow
    && left.auctionWindow === right.auctionWindow
    && left.isMember === right.isMember
    && left.isActiveMember === right.isActiveMember
    && left.claimableYield === right.claimableYield
    && areMembersEqual(left.members, right.members)
  );
};

export const isSamePeriod = (left: PeriodRoundSnapshot | null, right: PeriodRoundSnapshot | null): boolean => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.status === right.status
    && left.recipient.toLowerCase() === right.recipient.toLowerCase()
    && left.bestBidder.toLowerCase() === right.bestBidder.toLowerCase()
    && left.bestDiscount === right.bestDiscount
    && left.totalContributed === right.totalContributed
    && left.payoutAmount === right.payoutAmount
    && left.payoutClaimed === right.payoutClaimed
  );
};

export const isSameDiscovery = (left: PoolDiscoverySnapshot | null, right: PoolDiscoverySnapshot | null): boolean => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.listed === right.listed
    && left.poolStatus === right.poolStatus
    && left.activeMemberCount === right.activeMemberCount
    && left.targetMembers === right.targetMembers
    && left.minReputation === right.minReputation
  );
};

export const isSameInviteProposals = (left: InviteProposalView[], right: InviteProposalView[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (
      a.voteMode !== b.voteMode
      || a.proposalId !== b.proposalId
      || a.candidate.toLowerCase() !== b.candidate.toLowerCase()
      || (a.candidateUsername ?? '') !== (b.candidateUsername ?? '')
      || a.yesVotes !== b.yesVotes
      || a.noVotes !== b.noVotes
      || a.open !== b.open
      || a.myVote !== b.myVote
      || a.quorumMemberCount !== b.quorumMemberCount
      || a.requiredYesVotes !== b.requiredYesVotes
      || a.approvalRatio !== b.approvalRatio
      || Boolean(a.snapshotEligible) !== Boolean(b.snapshotEligible)
      || a.canVote !== b.canVote
    ) {
      return false;
    }
  }

  return true;
};

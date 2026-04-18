import type { ApiGroup } from './groupsService';

export type GroupStatus =
  | 'forming'
  | 'active'
  | 'funding'
  | 'bidding'
  | 'payout'
  | 'ended_period'
  | 'voting_extension'
  | 'archived';

const VALID_GROUP_STATUSES: GroupStatus[] = [
  'forming',
  'active',
  'funding',
  'bidding',
  'payout',
  'ended_period',
  'voting_extension',
  'archived',
];

const toNormalizedBackendStatus = (value: unknown): GroupStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_GROUP_STATUSES.find(item => item === normalized) ?? null;
};

export const deriveGroupStatus = (params: {
  poolStatus: number;
  periodStatus: number | null | undefined;
  cycleCompleted: boolean;
  extendVoteOpen: boolean;
  backendGroupStatus?: string | null;
}): GroupStatus => {
  const fromBackend = toNormalizedBackendStatus(params.backendGroupStatus);
  if (fromBackend) {
    return fromBackend;
  }

  if (params.poolStatus === 0) {
    return 'forming';
  }
  if (params.poolStatus === 2) {
    return 'archived';
  }

  if (params.poolStatus === 1 && params.cycleCompleted && params.extendVoteOpen) {
    return 'voting_extension';
  }

  switch (params.periodStatus) {
    case 0:
      return 'funding';
    case 1:
      return 'bidding';
    case 2:
      return 'payout';
    case 3:
      return 'ended_period';
    default:
      return params.poolStatus === 1 ? 'active' : 'forming';
  }
};

export const groupStatusLabel = (status: GroupStatus): string => {
  switch (status) {
    case 'forming':
      return 'Forming';
    case 'active':
      return 'Active';
    case 'funding':
      return 'Funding';
    case 'bidding':
      return 'Bidding';
    case 'payout':
      return 'Payout';
    case 'ended_period':
      return 'Period Ended';
    case 'voting_extension':
      return 'Voting Extension';
    case 'archived':
      return 'Archived';
    default:
      return 'Active';
  }
};

export const groupStatusRefreshProfile = (
  status: GroupStatus,
): {
  coreIntervalMs: number;
  heavyIntervalMs: number;
  backendIntervalMs: number;
} => {
  switch (status) {
    case 'forming':
      return {
        coreIntervalMs: 18_000,
        heavyIntervalMs: 75_000,
        backendIntervalMs: 60_000,
      };
    case 'funding':
    case 'bidding':
    case 'payout':
    case 'voting_extension':
      return {
        coreIntervalMs: 9_000,
        heavyIntervalMs: 45_000,
        backendIntervalMs: 30_000,
      };
    case 'ended_period':
      return {
        coreIntervalMs: 14_000,
        heavyIntervalMs: 65_000,
        backendIntervalMs: 45_000,
      };
    case 'archived':
    case 'active':
    default:
      return {
        coreIntervalMs: 25_000,
        heavyIntervalMs: 120_000,
        backendIntervalMs: 90_000,
      };
  }
};

export type UserActionAvailability = {
  canLeaveDuringForming: boolean;
  canProposeInvite: boolean;
  canRequestJoin: boolean;
  canContribute: boolean;
  canSubmitBid: boolean;
  canCloseAuction: boolean;
  canClaimPayout: boolean;
  canFinalizePeriod: boolean;
  canClaimYield: boolean;
  canVoteExtendContinue: boolean;
  canVoteExtendEnd: boolean;
};

export const resolveUserActionAvailability = (params: {
  groupStatus: GroupStatus;
  isViewerMember: boolean;
  isViewerActiveMember: boolean;
  isPublicRecruitment: boolean;
}): UserActionAvailability => {
  const {
    groupStatus,
    isViewerMember,
    isViewerActiveMember,
    isPublicRecruitment,
  } = params;
  const isActiveMember = isViewerActiveMember || isViewerMember;

  return {
    canLeaveDuringForming: isActiveMember && groupStatus === 'forming',
    canProposeInvite: isActiveMember && groupStatus === 'forming',
    canRequestJoin: !isActiveMember && isPublicRecruitment && groupStatus === 'forming',
    canContribute: isActiveMember && groupStatus === 'funding',
    canSubmitBid: isActiveMember && groupStatus === 'bidding',
    canCloseAuction: isActiveMember && groupStatus === 'bidding',
    canClaimPayout: isActiveMember && (groupStatus === 'payout' || groupStatus === 'ended_period'),
    canFinalizePeriod: isActiveMember && (groupStatus === 'payout' || groupStatus === 'ended_period'),
    canClaimYield: isActiveMember && groupStatus === 'archived',
    canVoteExtendContinue: isActiveMember && groupStatus === 'voting_extension',
    canVoteExtendEnd: isActiveMember && groupStatus === 'voting_extension',
  };
};

export const readBackendGroupStatus = (group: ApiGroup | null): GroupStatus | null => {
  if (!group) {
    return null;
  }

  return toNormalizedBackendStatus(group.groupStatus);
};

import { formatUnits, getAddress, isAddress } from 'viem';

import { fromInitAddress } from '../../components/UserDetail';
import { CONTRIBUTION_SYMBOL } from './constants';
import type { ApiGroup } from '../../services/groupsService';
import {
  deriveGroupStatus,
  groupStatusLabel,
  type GroupStatus,
} from '../../services/groupStatus';

export const deriveDashboardGroupStatus = (group: ApiGroup): GroupStatus => deriveGroupStatus({
  poolStatus: group.status,
  periodStatus: group.currentPeriodStatus,
  cycleCompleted: Boolean(group.cycleCompleted),
  extendVoteOpen: Boolean(group.extendVoteOpen),
  backendGroupStatus: group.groupStatus,
});

const statusToneClass = (status: GroupStatus): string => {
  switch (status) {
    case 'forming':
      return 'chip chip-warn';
    case 'deadlinepassed':
      return 'chip chip-risk';
    case 'archived':
      return 'chip';
    case 'voting_extension':
      return 'chip chip-signal';
    case 'funding':
    case 'bidding':
    case 'payout':
    case 'ended_period':
    case 'active':
      return 'chip chip-ok';
    default:
      return 'chip';
  }
};

export const statusMeta = (group: ApiGroup): { label: string; classes: string } => {
  const status = deriveDashboardGroupStatus(group);
  return {
    label: groupStatusLabel(status),
    classes: statusToneClass(status),
  };
};

export const formatAmount = (raw: string): string => {
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

export const formatCadence = (seconds: number): string => {
  const days = Math.max(1, Math.round(seconds / 86400));
  return `Every ${days} day${days === 1 ? '' : 's'}`;
};

export const poolEstimate = (group: ApiGroup): string => {
  try {
    const contribution = BigInt(group.contributionAmount);
    const members = BigInt(Math.max(group.activeMemberCount, 0));
    const pooled = contribution * members;
    return formatAmount(pooled.toString());
  } catch {
    return `0 ${CONTRIBUTION_SYMBOL}`;
  }
};

export const progressPercent = (group: ApiGroup): number => {
  const currentPeriod = Number(group.currentPeriod || '0');
  if (!Number.isFinite(currentPeriod) || currentPeriod <= 0 || group.targetMembers <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((currentPeriod / group.targetMembers) * 100)));
};

export const isGroupDisabled = (group: ApiGroup): boolean => group.status === 2 || group.activeMemberCount <= 0;

export const areGroupsEqual = (a: ApiGroup[], b: ApiGroup[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.poolId !== right.poolId
      || left.updatedAt !== right.updatedAt
      || left.status !== right.status
      || left.currentCycle !== right.currentCycle
      || left.currentPeriod !== right.currentPeriod
      || (left.groupStatus ?? '') !== (right.groupStatus ?? '')
      || left.activeMemberCount !== right.activeMemberCount
      || left.publicRecruitment !== right.publicRecruitment
    ) {
      return false;
    }
  }

  return true;
};

export const normalizeViewerAddress = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (isAddress(trimmed)) {
    return getAddress(trimmed);
  }
  const converted = fromInitAddress(trimmed);
  if (converted && isAddress(converted)) {
    return getAddress(converted);
  }
  return '';
};

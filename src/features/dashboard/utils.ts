import { formatUnits, getAddress, isAddress } from 'viem';

import { fromInitAddress } from '../../components/UserDetail';
import { CONTRIBUTION_SYMBOL } from './constants';
import type { ApiGroup } from '../../services/groupsService';

export const statusMeta = (status: number): { label: string; classes: string } => {
  switch (status) {
    case 0:
      return { label: 'Forming', classes: 'bg-amber-100 text-amber-700' };
    case 1:
      return { label: 'Active', classes: 'bg-emerald-100 text-emerald-700' };
    case 2:
      return { label: 'Archived', classes: 'bg-slate-200 text-slate-700' };
    default:
      return { label: 'Unknown', classes: 'bg-slate-100 text-slate-600' };
  }
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

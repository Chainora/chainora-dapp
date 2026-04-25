import { useCallback, useEffect, useRef, useState } from 'react';
import { getAddress, isAddress, type Address } from 'viem';
import { usePublicClient } from 'wagmi';

import { POOL_ABI } from '../../contract/chainoraAbis';
import { fetchNotifications } from '../../services/notificationService';
import {
  fetchGroups,
  type ApiGroup,
} from '../../services/groupsService';
import {
  deriveGroupStatus,
  type GroupStatus,
} from '../../services/groupStatus';

const ACTIVE_STATUSES = new Set<GroupStatus>([
  'active',
  'funding',
  'bidding',
  'payout',
  'ended_period',
  'voting_extension',
]);

const PERIOD_INFO_FETCH_STATUSES = new Set<GroupStatus>([
  'bidding',
  'payout',
  'ended_period',
]);

const STATS_REFRESH_INTERVAL_MS = 60_000;

export type DashboardStatValues = {
  activeJoinedCount: number;
  totalJoinedCount: number;
  formingPublicCount: number;
  contributionPerPeriod: bigint;
  bestBidPayoutEstimate: bigint;
  invitesPending: number;
};

const EMPTY_STATS: DashboardStatValues = {
  activeJoinedCount: 0,
  totalJoinedCount: 0,
  formingPublicCount: 0,
  contributionPerPeriod: 0n,
  bestBidPayoutEstimate: 0n,
  invitesPending: 0,
};

const lifecycleOf = (group: ApiGroup): GroupStatus =>
  deriveGroupStatus({
    poolStatus: group.status,
    periodStatus: group.currentPeriodStatus,
    cycleCompleted: Boolean(group.cycleCompleted),
    extendVoteOpen: Boolean(group.extendVoteOpen),
    backendGroupStatus: group.groupStatus,
  });

const toBigIntSafe = (value: string | undefined): bigint => {
  try {
    return BigInt(value ?? '0');
  } catch {
    return 0n;
  }
};

const toUintSafe = (value: number | string | undefined): bigint => {
  try {
    return BigInt(value ?? 0);
  } catch {
    return 0n;
  }
};

type PeriodInfoTuple = readonly [
  number, // status
  bigint, // startAt
  bigint, // contributionDeadline
  bigint, // auctionDeadline
  Address, // recipient
  Address, // bestBidder
  bigint, // bestDiscount
  bigint, // totalContributed
  bigint, // payoutAmount
  boolean, // payoutClaimed
  `0x${string}`, // reputationSnapshotId
];

export function useDashboardStats(
  token: string,
  viewerAddress: string,
  refreshNonce: number,
): DashboardStatValues {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<DashboardStatValues>(EMPTY_STATS);
  const seqRef = useRef(0);

  const computeStats = useCallback(async () => {
    if (!token || !viewerAddress || !isAddress(viewerAddress) || !publicClient) {
      setStats(EMPTY_STATS);
      return;
    }

    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const shouldApply = () => seq === seqRef.current;

    const viewer = getAddress(viewerAddress);

    try {
      const [joinedGroups, publicGroups, notifications] = await Promise.all([
        fetchGroups(token, 'joined', '', { sync: false, visibility: 'all' }).catch(() => [] as ApiGroup[]),
        fetchGroups(token, 'all', '', { sync: false, visibility: 'public' }).catch(() => [] as ApiGroup[]),
        fetchNotifications(token, { limit: 50 }).catch(() => ({ items: [], nextCursor: '' })),
      ]);

      if (!shouldApply()) return;

      const activeJoined = joinedGroups.filter(group => ACTIVE_STATUSES.has(lifecycleOf(group)));

      const activeJoinedCount = activeJoined.length;
      const totalJoinedCount = joinedGroups.length;
      const formingPublicCount = publicGroups.filter(group => lifecycleOf(group) === 'forming').length;

      const contributionPerPeriod = activeJoined.reduce(
        (acc, group) => acc + toBigIntSafe(group.contributionAmount),
        0n,
      );

      const bidGroups = activeJoined.filter(group =>
        PERIOD_INFO_FETCH_STATUSES.has(lifecycleOf(group)),
      );

      const periodResults = await Promise.allSettled(
        bidGroups.map(async group => {
          const cycleId = toUintSafe(group.currentCycle);
          const periodId = toUintSafe(group.currentPeriod);
          const result = (await publicClient.readContract({
            address: getAddress(group.poolAddress),
            abi: POOL_ABI,
            functionName: 'periodInfo',
            args: [cycleId, periodId],
          })) as PeriodInfoTuple;
          return { group, info: result };
        }),
      );

      if (!shouldApply()) return;

      let bestBidPayoutEstimate = 0n;
      for (const settled of periodResults) {
        if (settled.status !== 'fulfilled') continue;
        const { info } = settled.value;
        const bestBidder = info[5];
        const payoutAmount = info[8];
        const payoutClaimed = info[9];
        if (
          isAddress(bestBidder) &&
          getAddress(bestBidder) === viewer &&
          !payoutClaimed
        ) {
          bestBidPayoutEstimate += payoutAmount;
        }
      }

      const invitesPending = notifications.items.filter(
        item => item.type === 'GROUP_INVITE' && !item.isRead,
      ).length;

      if (!shouldApply()) return;

      setStats({
        activeJoinedCount,
        totalJoinedCount,
        formingPublicCount,
        contributionPerPeriod,
        bestBidPayoutEstimate,
        invitesPending,
      });
    } catch {
      if (!shouldApply()) return;
      setStats(EMPTY_STATS);
    }
  }, [publicClient, token, viewerAddress]);

  useEffect(() => {
    void computeStats();
  }, [computeStats, refreshNonce]);

  useEffect(() => {
    if (!token || !viewerAddress) return;
    const timer = window.setInterval(() => {
      void computeStats();
    }, STATS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [computeStats, token, viewerAddress]);

  return stats;
}

import { Navigate, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';

import {
  readDashboardGroupCacheEntry,
  readDashboardGroupCache,
  readJoinedPoolIdCacheEntry,
  readJoinedPoolIdCache,
  writeDashboardGroupCache,
  writeJoinedPoolIdCache,
} from '../features/dashboard/cache';
import {
  DASHBOARD_FORCE_SYNC_ONCE_KEY,
  DASHBOARD_JOINED_EMPTY_RESULT_SYNC_STREAK_THRESHOLD,
  DASHBOARD_JOINED_GROUP_CACHE_STALE_MS,
  DASHBOARD_JOINED_MEMBERSHIP_REFRESH_TTL_MS,
  DASHBOARD_JOINED_POLL_INTERVAL_MS,
  DASHBOARD_JOINED_RESUME_SYNC_MIN_GAP_MS,
  DASHBOARD_JOINED_SYNC_MIN_GAP_MS,
  DASHBOARD_PUBLIC_EMPTY_RESULT_SYNC_STREAK_THRESHOLD,
  DASHBOARD_PUBLIC_GROUP_CACHE_STALE_MS,
  CONTRIBUTION_SYMBOL,
  DASHBOARD_PREFERRED_MODE_KEY,
  DASHBOARD_PUBLIC_POLL_INTERVAL_MS,
  DASHBOARD_PUBLIC_RESUME_SYNC_MIN_GAP_MS,
  DASHBOARD_PUBLIC_SYNC_MIN_GAP_MS,
  DASHBOARD_SEARCH_DEBOUNCE_MS,
  JOINED_FILTER_TIMEOUT_MS,
} from '../features/dashboard/constants';
import { filterJoinedGroupsWithTimeout } from '../features/dashboard/groupMembership';
import type { DashboardFetchReason, DashboardMode } from '../features/dashboard/types';
import { DashboardGroupCard, DashboardStats } from '../features/dashboard/ui';
import {
  areGroupsEqual,
  deriveDashboardGroupStatus,
  formatAmount,
  normalizeViewerAddress,
} from '../features/dashboard/utils';
import { useAuth } from '../context/AuthContext';
import { fetchGroups, type ApiGroup, type GroupVisibility } from '../services/groupsService';

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
};

const toUnixMs = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type DashboardSortBy = 'created_at' | 'min_reputation';
type DashboardSortOrder = 'asc' | 'desc';

const toBigIntSafe = (value: string | undefined): bigint => {
  try {
    return BigInt(value ?? '0');
  } catch {
    return 0n;
  }
};

const sortDashboardGroups = (
  groups: ApiGroup[],
  sortBy: DashboardSortBy,
  sortOrder: DashboardSortOrder,
): ApiGroup[] =>
  [...groups].sort((left, right) => {
    const direction = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'min_reputation') {
      const leftValue = toBigIntSafe(left.minReputation);
      const rightValue = toBigIntSafe(right.minReputation);
      if (leftValue !== rightValue) {
        return leftValue > rightValue ? direction : -direction;
      }
    } else {
      const createdDelta = toUnixMs(left.createdAt) - toUnixMs(right.createdAt);
      if (createdDelta !== 0) {
        return createdDelta * direction;
      }
    }

    const updatedDelta = toUnixMs(left.updatedAt) - toUnixMs(right.updatedAt);
    if (updatedDelta !== 0) {
      return updatedDelta * direction;
    }

    return left.poolId.localeCompare(right.poolId);
  });

const fetchReasonPriority: Record<DashboardFetchReason, number> = {
  poll: 1,
  initial: 2,
  resume_visible: 3,
  filter_change: 4,
  manual: 5,
};

const mergeFetchReason = (
  current: DashboardFetchReason | null,
  next: DashboardFetchReason,
): DashboardFetchReason => {
  if (!current) {
    return next;
  }
  return fetchReasonPriority[next] >= fetchReasonPriority[current] ? next : current;
};

type LoadKeyMeta = {
  lastChainSyncAt: number;
  lastAnyFetchAt: number;
  emptyResultStreak: number;
};

type JoinedMembershipMeta = {
  candidateSignature: string;
  lastVerifiedAt: number;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const { isAuthenticated, token, refreshSession, address } = useAuth();

  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [mode, setMode] = useState<DashboardMode>('public');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<DashboardSortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<DashboardSortOrder>('desc');
  const [minReputationFilter, setMinReputationFilter] = useState('');
  const [maxReputationFilter, setMaxReputationFilter] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState('');
  const loadSeqRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingRefetchRef = useRef<DashboardFetchReason | null>(null);
  const drainingRef = useRef(false);
  const forceSyncFirstLoadRef = useRef(false);
  const hasRequestedInitialLoadRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const loadMetaByKeyRef = useRef<Map<string, LoadKeyMeta>>(new Map());
  const joinedMembershipMetaRef = useRef<Map<string, JoinedMembershipMeta>>(new Map());

  const viewerAddress = useMemo(() => normalizeViewerAddress(address), [address]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      setDebouncedQuery(query);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, DASHBOARD_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const normalizedQuery = useMemo(() => debouncedQuery.trim(), [debouncedQuery]);
  const normalizedMinReputationFilter = useMemo(() => minReputationFilter.trim(), [minReputationFilter]);
  const normalizedMaxReputationFilter = useMemo(() => maxReputationFilter.trim(), [maxReputationFilter]);

  const dashboardQueryKey = useMemo(
    () =>
      [
        normalizedQuery.toLowerCase(),
        sortBy,
        sortOrder,
        normalizedMinReputationFilter,
        normalizedMaxReputationFilter,
      ].join('|'),
    [
      normalizedMaxReputationFilter,
      normalizedMinReputationFilter,
      normalizedQuery,
      sortBy,
      sortOrder,
    ],
  );

  const loadKey = useMemo(
    () => `${mode}:${normalizedQuery.toLowerCase()}:${viewerAddress.toLowerCase()}:${dashboardQueryKey}`,
    [dashboardQueryKey, mode, normalizedQuery, viewerAddress],
  );

  const joinedMembershipKey = useMemo(
    () =>
      `${viewerAddress.toLowerCase()}:${mode}:${normalizedQuery.toLowerCase()}:${normalizedMinReputationFilter}:${normalizedMaxReputationFilter}`,
    [
      mode,
      normalizedMaxReputationFilter,
      normalizedMinReputationFilter,
      normalizedQuery,
      viewerAddress,
    ],
  );

  const performLoadGroups = useCallback(async (reason: DashboardFetchReason) => {
    if (!token) {
      return;
    }

    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;

    const shouldApply = (): boolean => loadSeq === loadSeqRef.current;
    setError('');

    const nowMs = Date.now();
    const existingMeta = loadMetaByKeyRef.current.get(loadKey);
    const loadMeta: LoadKeyMeta = existingMeta ?? {
      lastChainSyncAt: 0,
      lastAnyFetchAt: 0,
      emptyResultStreak: 0,
    };
    const syncMinGapMs = mode === 'public'
      ? DASHBOARD_PUBLIC_SYNC_MIN_GAP_MS
      : DASHBOARD_JOINED_SYNC_MIN_GAP_MS;
    const resumeSyncGapMs = mode === 'public'
      ? DASHBOARD_PUBLIC_RESUME_SYNC_MIN_GAP_MS
      : DASHBOARD_JOINED_RESUME_SYNC_MIN_GAP_MS;
    const groupCacheStaleMs = mode === 'public'
      ? DASHBOARD_PUBLIC_GROUP_CACHE_STALE_MS
      : DASHBOARD_JOINED_GROUP_CACHE_STALE_MS;
    const emptyResultSyncStreakThreshold = mode === 'public'
      ? DASHBOARD_PUBLIC_EMPTY_RESULT_SYNC_STREAK_THRESHOLD
      : DASHBOARD_JOINED_EMPTY_RESULT_SYNC_STREAK_THRESHOLD;

    const cacheEntry = readDashboardGroupCacheEntry(mode, dashboardQueryKey);
    const isCacheFresh = Boolean(
      cacheEntry
      && cacheEntry.cachedAt > 0
      && (nowMs - cacheEntry.cachedAt) <= groupCacheStaleMs,
    );
    const isFirstLoadForKey = loadMeta.lastAnyFetchAt === 0;

    let shouldSync = false;
    if (forceSyncFirstLoadRef.current || reason === 'manual') {
      shouldSync = true;
    } else if (isFirstLoadForKey) {
      shouldSync = !isCacheFresh;
    } else if (reason === 'poll') {
      shouldSync = (nowMs - loadMeta.lastChainSyncAt) >= syncMinGapMs
        || loadMeta.emptyResultStreak >= emptyResultSyncStreakThreshold;
    } else if (reason === 'resume_visible') {
      shouldSync = (nowMs - loadMeta.lastChainSyncAt) >= resumeSyncGapMs;
    } else {
      shouldSync = !isCacheFresh;
    }

    try {
      let result: ApiGroup[];
      const scope = 'all';
      const visibility: GroupVisibility = mode === 'public' ? 'public' : 'all';

      const fetchWithToken = async (accessToken: string): Promise<ApiGroup[]> =>
        fetchGroups(accessToken, scope, normalizedQuery, {
          sync: shouldSync,
          visibility,
          sortBy,
          sortOrder,
          minReputation: normalizedMinReputationFilter,
          maxReputation: normalizedMaxReputationFilter,
        });

      try {
        result = await fetchWithToken(token);
      } catch {
        const refreshedToken = await refreshSession();
        result = await fetchWithToken(refreshedToken);
      }

      loadMeta.lastAnyFetchAt = nowMs;
      if (shouldSync) {
        loadMeta.lastChainSyncAt = nowMs;
      }
      forceSyncFirstLoadRef.current = false;

      if (!shouldApply()) {
        return;
      }

      if (mode === 'joined') {
        const viewerAddressLower = viewerAddress.toLowerCase();
        const creatorPoolSet = new Set(
          (viewerAddressLower
            ? result
                .filter(group => group.creatorAddress.trim().toLowerCase() === viewerAddressLower)
                .map(group => group.poolId.toLowerCase())
            : []),
        );
        const cacheViewerKey = viewerAddress || address;
        const joinedPoolEntry = readJoinedPoolIdCacheEntry(cacheViewerKey);
        const cachedPoolIds = joinedPoolEntry?.poolIds ?? readJoinedPoolIdCache(cacheViewerKey);
        const fallbackPoolSet = new Set([
          ...cachedPoolIds.map(item => item.toLowerCase()),
          ...creatorPoolSet,
        ]);

        if (fallbackPoolSet.size > 0) {
          const quickResult = sortDashboardGroups(
            result.filter(group => fallbackPoolSet.has(group.poolId.toLowerCase())),
            sortBy,
            sortOrder,
          );
          if (quickResult.length > 0 && shouldApply()) {
            setGroups(previous => (areGroupsEqual(previous, quickResult) ? previous : quickResult));
          }
        }

        if (!viewerAddress) {
          result = fallbackPoolSet.size > 0
            ? result.filter(group => fallbackPoolSet.has(group.poolId.toLowerCase()))
            : [];
        } else {
          const candidateSignature = result
            .map(group => group.poolId.toLowerCase())
            .sort()
            .join(',');
          const joinedMembershipMeta = joinedMembershipMetaRef.current.get(joinedMembershipKey);
          const joinedCacheFresh = Boolean(
            joinedPoolEntry
            && joinedPoolEntry.cachedAt > 0
            && (nowMs - joinedPoolEntry.cachedAt) <= DASHBOARD_JOINED_MEMBERSHIP_REFRESH_TTL_MS,
          );
          const candidateChanged = joinedMembershipMeta?.candidateSignature !== candidateSignature;
          const membershipExpired = !joinedMembershipMeta
            || (nowMs - joinedMembershipMeta.lastVerifiedAt) >= DASHBOARD_JOINED_MEMBERSHIP_REFRESH_TTL_MS;
          const shouldVerifyMembership = result.length > 0
            && (reason === 'manual' || candidateChanged || membershipExpired || !joinedCacheFresh);

          if (shouldVerifyMembership) {
            const joinedFilter = await filterJoinedGroupsWithTimeout(
              publicClient,
              result,
              viewerAddress,
              JOINED_FILTER_TIMEOUT_MS,
            );

            if (!shouldApply()) {
              return;
            }

            if (!joinedFilter.timedOut) {
              const joinedPoolSet = new Set(joinedFilter.groups.map(group => group.poolId.toLowerCase()));
              creatorPoolSet.forEach(poolId => joinedPoolSet.add(poolId));
              result = result.filter(group => joinedPoolSet.has(group.poolId.toLowerCase()));
              writeJoinedPoolIdCache(cacheViewerKey, result.map(group => group.poolId));
            } else if (fallbackPoolSet.size > 0) {
              result = result.filter(group => fallbackPoolSet.has(group.poolId.toLowerCase()));
            } else {
              result = [];
            }
          } else {
            result = fallbackPoolSet.size > 0
              ? result.filter(group => fallbackPoolSet.has(group.poolId.toLowerCase()))
              : [];
          }

          joinedMembershipMetaRef.current.set(joinedMembershipKey, {
            candidateSignature,
            lastVerifiedAt: nowMs,
          });
        }
      }

      if (!shouldApply()) {
        return;
      }

      const nextGroups = sortDashboardGroups(result, sortBy, sortOrder);
      loadMeta.emptyResultStreak = nextGroups.length === 0 ? loadMeta.emptyResultStreak + 1 : 0;
      loadMetaByKeyRef.current.set(loadKey, loadMeta);
      setGroups(previous => (areGroupsEqual(previous, nextGroups) ? previous : nextGroups));
      writeDashboardGroupCache(mode, dashboardQueryKey, nextGroups);
    } catch (loadError) {
      if (!shouldApply()) {
        return;
      }
      const message = loadError instanceof Error ? loadError.message : 'Failed to load groups';
      setError(message);
    } finally {
      if (!shouldApply()) {
        return;
      }
      setHasLoadedOnce(true);
    }
  }, [
    address,
    dashboardQueryKey,
    joinedMembershipKey,
    loadKey,
    mode,
    normalizedMaxReputationFilter,
    normalizedMinReputationFilter,
    normalizedQuery,
    publicClient,
    refreshSession,
    sortBy,
    sortOrder,
    token,
    viewerAddress,
  ]);

  const startLoadDrain = useCallback(() => {
    if (drainingRef.current) {
      return;
    }

    drainingRef.current = true;
    void (async () => {
      while (pendingRefetchRef.current) {
        const nextReason = pendingRefetchRef.current;
        pendingRefetchRef.current = null;
        inFlightRef.current = true;
        try {
          await performLoadGroups(nextReason);
        } finally {
          inFlightRef.current = false;
        }
      }
    })().finally(() => {
      drainingRef.current = false;
      if (pendingRefetchRef.current) {
        startLoadDrain();
      }
    });
  }, [performLoadGroups]);

  const requestLoad = useCallback((reason: DashboardFetchReason) => {
    pendingRefetchRef.current = mergeFetchReason(pendingRefetchRef.current, reason);
    startLoadDrain();
  }, [startLoadDrain]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const preferredMode = window.sessionStorage.getItem(DASHBOARD_PREFERRED_MODE_KEY);
    if (preferredMode === 'public' || preferredMode === 'joined') {
      setMode(preferredMode);
    }
    const shouldForceSync = window.sessionStorage.getItem(DASHBOARD_FORCE_SYNC_ONCE_KEY) === '1';
    forceSyncFirstLoadRef.current = shouldForceSync;
    window.sessionStorage.removeItem(DASHBOARD_PREFERRED_MODE_KEY);
    window.sessionStorage.removeItem(DASHBOARD_FORCE_SYNC_ONCE_KEY);
  }, []);

  useEffect(() => {
    if (!token) {
      hasRequestedInitialLoadRef.current = false;
      pendingRefetchRef.current = null;
      return;
    }

    if (!hasRequestedInitialLoadRef.current) {
      hasRequestedInitialLoadRef.current = true;
      requestLoad('initial');
      return;
    }

    requestLoad('filter_change');
  }, [loadKey, requestLoad, token]);

  useEffect(() => {
    const cached = readDashboardGroupCache(mode, dashboardQueryKey);
    if (cached && cached.length > 0) {
      const sortedCached = sortDashboardGroups(cached, sortBy, sortOrder);
      setGroups(previous => (areGroupsEqual(previous, sortedCached) ? previous : sortedCached));
    }
  }, [dashboardQueryKey, mode, sortBy, sortOrder]);

  useEffect(() => {
    if (!token) {
      wasHiddenRef.current = false;
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    const activeDelay = mode === 'joined'
      ? DASHBOARD_JOINED_POLL_INTERVAL_MS
      : DASHBOARD_PUBLIC_POLL_INTERVAL_MS;

    const poll = () => {
      if (cancelled) {
        return;
      }

      if (!isDocumentVisible()) {
        wasHiddenRef.current = true;
        scheduleNext(activeDelay);
        return;
      }

      requestLoad('poll');
      scheduleNext(activeDelay);
    };

    function scheduleNext(delay: number) {
      timer = window.setTimeout(
        () => {
          poll();
        },
        delay,
      );
    }

    scheduleNext(activeDelay);

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [mode, requestLoad, token]);

  useEffect(() => {
    if (!token || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const triggerResume = () => {
      if (!isDocumentVisible()) {
        wasHiddenRef.current = true;
        return;
      }
      if (!wasHiddenRef.current) {
        return;
      }
      wasHiddenRef.current = false;
      requestLoad('resume_visible');
    };

    const onVisibilityChange = () => {
      if (!isDocumentVisible()) {
        wasHiddenRef.current = true;
        return;
      }
      triggerResume();
    };

    window.addEventListener('focus', triggerResume);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', triggerResume);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [requestLoad, token]);

  const lifecycleStatuses = useMemo(() => groups.map(deriveDashboardGroupStatus), [groups]);
  const activeCount = useMemo(
    () => lifecycleStatuses.filter(status => status !== 'forming' && status !== 'archived').length,
    [lifecycleStatuses],
  );
  const formingCount = useMemo(
    () => lifecycleStatuses.filter(status => status === 'forming').length,
    [lifecycleStatuses],
  );
  const totalContributed = useMemo(() => {
    try {
      const sum = groups.reduce((acc, item) => acc + BigInt(item.contributionAmount), 0n);
      return formatAmount(sum.toString());
    } catch {
      return `0 ${CONTRIBUTION_SYMBOL}`;
    }
  }, [groups]);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-7">
      <DashboardStats
        activeCount={activeCount}
        formingCount={formingCount}
        totalContributed={totalContributed}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-slate-900">
          {mode === 'public' ? 'Public Groups' : 'Groups You Joined'}
        </h1>
        <button
          type="button"
          onClick={() => {
            void navigate({ to: '/create-group' });
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          + Create Group
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search by name, pool id, or pool address"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        />
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value as DashboardSortBy)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
        >
          <option value="created_at">Sort: Created Time</option>
          <option value="min_reputation">Sort: Min Reputation</option>
        </select>
        <select
          value={sortOrder}
          onChange={event => setSortOrder(event.target.value as DashboardSortOrder)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
        >
          <option value="desc">Order: Desc</option>
          <option value="asc">Order: Asc</option>
        </select>
        <input
          value={minReputationFilter}
          onChange={event => setMinReputationFilter(event.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="Min rep"
          className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
        />
        <input
          value={maxReputationFilter}
          onChange={event => setMaxReputationFilter(event.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="Max rep"
          className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
        />
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode('public')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'public' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Public
          </button>
          <button
            type="button"
            onClick={() => setMode('joined')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'joined' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Joined
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            requestLoad('manual');
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
        >
          Refresh now
        </button>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {hasLoadedOnce && groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No groups found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(group => (
            <DashboardGroupCard
              key={group.poolAddress}
              group={group}
              onOpen={poolId => {
                void navigate({
                  to: '/group/$poolId',
                  params: { poolId },
                });
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

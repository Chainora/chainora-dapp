import { Navigate, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../components/ui/Button';
import { LoadingCard } from '../components/ui/LoadingCard';
import {
  CONTRIBUTION_SYMBOL,
  DASHBOARD_FORCE_SYNC_ONCE_KEY,
  DASHBOARD_JOINED_POLL_INTERVAL_MS,
  DASHBOARD_PREFERRED_MODE_KEY,
  DASHBOARD_PUBLIC_POLL_INTERVAL_MS,
  DASHBOARD_SEARCH_DEBOUNCE_MS,
} from '../features/dashboard/constants';
import { DashboardHero } from '../features/dashboard/DashboardHero';
import {
  type DashboardSortBy,
  type DashboardSortOrder,
} from '../features/dashboard/DashboardFilterBar';
import { DashboardGroupSection } from '../features/dashboard/DashboardGroupSection';
import { useDashboardStats } from '../features/dashboard/useDashboardStats';
import type { DashboardMode } from '../features/dashboard/types';
import { DashboardGroupCard, DashboardStats } from '../features/dashboard/ui';
import {
  areGroupsEqual,
  deriveDashboardGroupStatus,
  formatAmount,
} from '../features/dashboard/utils';
import { useAuth } from '../context/AuthContext';
import { fetchGroups, type ApiGroup, type GroupScope, type GroupVisibility } from '../services/groupsService';

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

const truncateAddress = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

const PAGE_SIZE = 6;

const emptyStateStyle = {
  background: 'transparent',
  border: '1px dashed var(--ink-6)',
  borderRadius: 'var(--r-xl)',
  padding: '40px 32px',
} as const;

const emptyIconWrapStyle = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: 'var(--ink-3)',
} as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, token, refreshSession, username, address } = useAuth();

  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [mode, setMode] = useState<DashboardMode>('public');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<DashboardSortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<DashboardSortOrder>('desc');
  const [minReputationFilter, setMinReputationFilter] = useState('');
  const [maxReputationFilter, setMaxReputationFilter] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [statsRefreshNonce, setStatsRefreshNonce] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const loadSeqRef = useRef(0);
  const wasHiddenRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  const performLoadGroups = useCallback(async () => {
    if (!token) {
      return;
    }

    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;
    const shouldApply = (): boolean => loadSeq === loadSeqRef.current;

    setIsLoading(true);
    setError('');

    try {
      const scope: GroupScope = mode === 'joined' ? 'joined' : 'all';
      const visibility: GroupVisibility = mode === 'public' ? 'public' : 'all';

      const fetchWithToken = async (accessToken: string): Promise<ApiGroup[]> =>
        fetchGroups(accessToken, scope, normalizedQuery, {
          sync: false,
          visibility,
          sortBy,
          sortOrder,
          minReputation: normalizedMinReputationFilter,
          maxReputation: normalizedMaxReputationFilter,
        });

      let result: ApiGroup[];
      try {
        result = await fetchWithToken(token);
      } catch {
        const refreshedToken = await refreshSession();
        result = await fetchWithToken(refreshedToken);
      }

      if (!shouldApply()) {
        return;
      }

      const nextGroups = sortDashboardGroups(result, sortBy, sortOrder);
      setGroups(previous => (areGroupsEqual(previous, nextGroups) ? previous : nextGroups));
      setLastUpdatedAt(Date.now());
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
      setIsLoading(false);
    }
  }, [
    maxReputationFilter,
    minReputationFilter,
    mode,
    normalizedMaxReputationFilter,
    normalizedMinReputationFilter,
    normalizedQuery,
    refreshSession,
    sortBy,
    sortOrder,
    token,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const preferredMode = window.sessionStorage.getItem(DASHBOARD_PREFERRED_MODE_KEY);
    if (preferredMode === 'public' || preferredMode === 'joined') {
      setMode(preferredMode);
    }
    window.sessionStorage.removeItem(DASHBOARD_PREFERRED_MODE_KEY);
    window.sessionStorage.removeItem(DASHBOARD_FORCE_SYNC_ONCE_KEY);
  }, []);

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setHasLoadedOnce(false);
      setIsLoading(false);
      return;
    }

    void performLoadGroups();
  }, [
    maxReputationFilter,
    minReputationFilter,
    mode,
    normalizedMaxReputationFilter,
    normalizedMinReputationFilter,
    normalizedQuery,
    performLoadGroups,
    sortBy,
    sortOrder,
    token,
  ]);

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

      void performLoadGroups();
      scheduleNext(activeDelay);
    };

    function scheduleNext(delay: number) {
      timer = window.setTimeout(() => {
        poll();
      }, delay);
    }

    scheduleNext(activeDelay);

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [mode, performLoadGroups, token]);

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
      void performLoadGroups();
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
  }, [performLoadGroups, token]);

  const visibleGroups = useMemo(() => {
    if (mode !== 'public') {
      return groups;
    }
    if (normalizedQuery) {
      return groups;
    }
    return groups.filter(group => deriveDashboardGroupStatus(group) === 'forming');
  }, [groups, mode, normalizedQuery]);

  useEffect(() => {
    setPage(1);
  }, [
    mode,
    normalizedQuery,
    sortBy,
    sortOrder,
    normalizedMinReputationFilter,
    normalizedMaxReputationFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedGroups = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleGroups.slice(start, start + PAGE_SIZE);
  }, [visibleGroups, safePage]);

  const stats = useDashboardStats(token, address, statsRefreshNonce);

  const greetingName = useMemo(() => {
    const trimmedUsername = username?.trim() ?? '';
    if (trimmedUsername) return trimmedUsername;
    if (address) return truncateAddress(address);
    return 'Welcome back';
  }, [username, address]);

  const handleSearchTrigger = useCallback(() => {
    setFilterOpen(true);
  }, []);

  const handleResetFilters = useCallback(() => {
    setQuery('');
    setMinReputationFilter('');
    setMaxReputationFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
  }, []);

  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    setStatsRefreshNonce(value => value + 1);
    try {
      await performLoadGroups();
    } finally {
      setManualRefreshing(false);
    }
  }, [performLoadGroups]);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const contributionPerPeriodLabel = formatAmount(stats.contributionPerPeriod.toString());
  const bestBidPayoutLabel = formatAmount(stats.bestBidPayoutEstimate.toString());
  const allChipCount = mode === 'public' ? visibleGroups.length : stats.formingPublicCount;
  const joinedChipCount = mode === 'joined' ? visibleGroups.length : stats.totalJoinedCount;
  const heroGroupCount = mode === 'public' ? allChipCount : joinedChipCount;
  const isFilterActive =
    Boolean(normalizedQuery)
      || Boolean(normalizedMinReputationFilter)
      || Boolean(normalizedMaxReputationFilter)
      || sortBy !== 'created_at'
      || sortOrder !== 'desc';

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-7 px-6">
      <DashboardHero
        greetingName={greetingName}
        mode={mode}
        groupCount={heroGroupCount}
        lastUpdatedAt={lastUpdatedAt}
        onSearchFocus={handleSearchTrigger}
        onCreateGroup={() => {
          void navigate({ to: '/create-group' });
        }}
      />

      <DashboardStats
        activeJoinedCount={stats.activeJoinedCount}
        contributionPerPeriod={
          stats.contributionPerPeriod === 0n ? `0 ${CONTRIBUTION_SYMBOL}` : contributionPerPeriodLabel
        }
        bestBidPayoutEstimate={
          stats.bestBidPayoutEstimate === 0n ? `0 ${CONTRIBUTION_SYMBOL}` : bestBidPayoutLabel
        }
        invitesPending={stats.invitesPending}
      />

      <DashboardGroupSection
        mode={mode}
        onModeChange={setMode}
        totalCount={allChipCount}
        joinedCount={joinedChipCount}
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        minReputation={minReputationFilter}
        onMinReputationChange={setMinReputationFilter}
        maxReputation={maxReputationFilter}
        onMaxReputationChange={setMaxReputationFilter}
        onRefresh={() => {
          void handleRefresh();
        }}
        searchInputRef={searchInputRef}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        isRefreshing={manualRefreshing}
      >
        {error ? (
          <div
            className="t-small c-risk px-4 py-3"
            style={{
              background: 'var(--risk-bg)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 'var(--r-md)',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        {isLoading && !hasLoadedOnce ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <LoadingCard count={6} />
          </div>
        ) : null}

        {hasLoadedOnce && visibleGroups.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 text-center"
            style={emptyStateStyle}
          >
            <span
              className="inline-flex items-center justify-center"
              style={emptyIconWrapStyle}
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--haze-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v12M2 8h12" />
              </svg>
            </span>
            <h3 className="t-h4 c-1">No groups found</h3>
            <p className="t-small c-3" style={{ maxWidth: '36ch' }}>
              {mode === 'joined'
                ? 'You have not joined any group yet. Browse public groups or create your own.'
                : isFilterActive
                  ? 'No public groups match your search. Try clearing filters or create a new group.'
                  : 'No public groups are recruiting right now. Search to view groups in other states or create your own.'}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              {isFilterActive ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset filters
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigate({ to: '/create-group' });
                }}
              >
                Create group
              </Button>
            </div>
          </div>
        ) : null}

        {hasLoadedOnce && visibleGroups.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedGroups.map(group => (
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

            {totalPages > 1 ? (
              <div
                className="mt-5 flex items-center justify-between gap-3"
                style={{
                  background: 'var(--ink-2)',
                  border: '1px solid var(--ink-5)',
                  borderRadius: 'var(--r-lg)',
                  padding: '10px 14px',
                }}
              >
                <p className="t-tiny c-3">
                  Showing{' '}
                  <span className="t-mono c-1">
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visibleGroups.length)}
                  </span>{' '}
                  of <span className="t-mono c-1">{visibleGroups.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <p className="t-tiny c-2">
                    Page <span className="t-mono c-1">{safePage}</span> of{' '}
                    <span className="t-mono c-1">{totalPages}</span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </DashboardGroupSection>
    </section>
  );
}

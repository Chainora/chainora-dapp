import { Navigate, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';

import {
  readDashboardGroupCache,
  readJoinedPoolIdCache,
  writeDashboardGroupCache,
  writeJoinedPoolIdCache,
} from '../features/dashboard/cache';
import {
  CONTRIBUTION_SYMBOL,
  JOINED_FILTER_TIMEOUT_MS,
  JOINED_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_MS,
} from '../features/dashboard/constants';
import { filterJoinedGroupsWithTimeout } from '../features/dashboard/groupMembership';
import type { DashboardMode } from '../features/dashboard/types';
import { DashboardGroupCard, DashboardStats } from '../features/dashboard/ui';
import { areGroupsEqual, formatAmount, normalizeViewerAddress } from '../features/dashboard/utils';
import { useAuth } from '../context/AuthContext';
import { fetchGroups, type ApiGroup, type GroupVisibility } from '../services/groupsService';

export function DashboardPage() {
  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const { isAuthenticated, token, refreshSession, address } = useAuth();

  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [mode, setMode] = useState<DashboardMode>('public');
  const [query, setQuery] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState('');
  const loadInFlightRef = useRef(false);
  const viewerAddress = useMemo(() => normalizeViewerAddress(address), [address]);

  const loadGroups = useCallback(async (sync = false) => {
    if (!token || loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setError('');

    try {
      let accessToken = token;
      let result: ApiGroup[];
      const scope = 'all';
      const visibility: GroupVisibility = mode === 'public' ? 'public' : 'all';
      const shouldSync = mode === 'public' || sync;

      try {
        result = await fetchGroups(accessToken, scope, query, { sync: shouldSync, visibility });
      } catch {
        accessToken = await refreshSession();
        result = await fetchGroups(accessToken, scope, query, { sync: shouldSync, visibility });
      }

      if (mode === 'public') {
        result = result.filter(group => group.publicRecruitment === true);
      }

      if (mode === 'joined') {
        const cachedPoolIds = readJoinedPoolIdCache(viewerAddress || address);
        if (cachedPoolIds.length > 0) {
          const cachedPoolSet = new Set(cachedPoolIds.map(item => item.toLowerCase()));
          const quickResult = result.filter(group => cachedPoolSet.has(group.poolId.toLowerCase()));
          if (quickResult.length > 0) {
            setGroups(previous => (areGroupsEqual(previous, quickResult) ? previous : quickResult));
          }
        }

        const joinedFilter = viewerAddress
          ? await filterJoinedGroupsWithTimeout(
            publicClient,
            result,
            viewerAddress,
            JOINED_FILTER_TIMEOUT_MS,
          )
          : { timedOut: true, groups: [] as ApiGroup[] };

        if (!joinedFilter.timedOut) {
          result = joinedFilter.groups;
          writeJoinedPoolIdCache(viewerAddress || address, result.map(group => group.poolId));
        } else if (cachedPoolIds.length > 0) {
          const cachedPoolSet = new Set(cachedPoolIds.map(item => item.toLowerCase()));
          result = result.filter(group => cachedPoolSet.has(group.poolId.toLowerCase()));
        } else {
          result = [];
        }
      }

      setGroups(previous => (areGroupsEqual(previous, result) ? previous : result));
      writeDashboardGroupCache(mode, query, result);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load groups';
      setError(message);
    } finally {
      setHasLoadedOnce(true);
      loadInFlightRef.current = false;
    }
  }, [address, mode, publicClient, query, refreshSession, token, viewerAddress]);

  useEffect(() => {
    const cached = readDashboardGroupCache(mode, query);
    if (cached && cached.length > 0) {
      setGroups(previous => (areGroupsEqual(previous, cached) ? previous : cached));
    }
  }, [mode, query]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      await loadGroups(false);
      if (cancelled) {
        return;
      }

      timer = window.setTimeout(
        () => {
          void poll();
        },
        mode === 'joined' ? JOINED_REFRESH_INTERVAL_MS : REFRESH_INTERVAL_MS,
      );
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [loadGroups, mode]);

  const activeCount = useMemo(() => groups.filter(group => group.status === 1).length, [groups]);
  const formingCount = useMemo(() => groups.filter(group => group.status === 0).length, [groups]);
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
            void loadGroups(true);
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

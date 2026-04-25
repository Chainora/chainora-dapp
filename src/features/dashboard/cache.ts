import type { ApiGroup } from '../../services/groupsService';
import {
  DASHBOARD_GROUP_CACHE_KEY_PREFIX,
  DASHBOARD_JOINED_POOL_CACHE_KEY_PREFIX,
} from './constants';
import type { DashboardMode } from './types';

const normalizeViewerKey = (viewerKey?: string): string =>
  String(viewerKey ?? '').trim().toLowerCase();

export const buildDashboardGroupCacheKey = (mode: DashboardMode, query: string, viewerKey?: string): string => {
  const normalizedViewer = normalizeViewerKey(viewerKey);
  return `${DASHBOARD_GROUP_CACHE_KEY_PREFIX}:${mode}:${normalizedViewer}:${query.trim().toLowerCase()}`;
};

export const buildJoinedPoolCacheKey = (viewerAddress: string): string =>
  `${DASHBOARD_JOINED_POOL_CACHE_KEY_PREFIX}:${viewerAddress.trim().toLowerCase()}`;

export type DashboardGroupCacheEntry = {
  cachedAt: number;
  groups: ApiGroup[];
};

export const readDashboardGroupCacheEntry = (
  mode: DashboardMode,
  query: string,
  viewerKey?: string,
): DashboardGroupCacheEntry | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildDashboardGroupCacheKey(mode, query, viewerKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { groups?: ApiGroup[] };
    if (!Array.isArray(parsed.groups)) {
      return null;
    }

    const parsedWithMeta = parsed as { groups?: ApiGroup[]; cachedAt?: string | number };
    let cachedAt = 0;
    if (typeof parsedWithMeta.cachedAt === 'string') {
      const parsedCachedAt = Date.parse(parsedWithMeta.cachedAt);
      cachedAt = Number.isFinite(parsedCachedAt) ? parsedCachedAt : 0;
    } else if (typeof parsedWithMeta.cachedAt === 'number' && Number.isFinite(parsedWithMeta.cachedAt)) {
      cachedAt = parsedWithMeta.cachedAt;
    }

    return {
      cachedAt,
      groups: parsed.groups,
    };
  } catch {
    return null;
  }
};

export const readDashboardGroupCache = (mode: DashboardMode, query: string, viewerKey?: string): ApiGroup[] | null => {
  const entry = readDashboardGroupCacheEntry(mode, query, viewerKey);
  return entry?.groups ?? null;
};

export const writeDashboardGroupCache = (mode: DashboardMode, query: string, groups: ApiGroup[], viewerKey?: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      buildDashboardGroupCacheKey(mode, query, viewerKey),
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        groups,
      }),
    );
  } catch {
    // Ignore storage quota or serialization issues.
  }
};

export type JoinedPoolIdCacheEntry = {
  cachedAt: number;
  poolIds: string[];
};

export const readJoinedPoolIdCacheEntry = (viewerAddress: string): JoinedPoolIdCacheEntry | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = buildJoinedPoolCacheKey(viewerAddress);
  if (!key.endsWith(':')) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return {
          cachedAt: 0,
          poolIds: [],
        };
      }
      const parsed = JSON.parse(raw) as { poolIds?: string[]; cachedAt?: string | number };
      if (!Array.isArray(parsed.poolIds)) {
        return {
          cachedAt: 0,
          poolIds: [],
        };
      }
      const poolIds = parsed.poolIds
        .map(item => String(item).trim())
        .filter(Boolean);

      let cachedAt = 0;
      if (typeof parsed.cachedAt === 'string') {
        const parsedCachedAt = Date.parse(parsed.cachedAt);
        cachedAt = Number.isFinite(parsedCachedAt) ? parsedCachedAt : 0;
      } else if (typeof parsed.cachedAt === 'number' && Number.isFinite(parsed.cachedAt)) {
        cachedAt = parsed.cachedAt;
      }

      return {
        cachedAt,
        poolIds,
      };
    } catch {
      return {
        cachedAt: 0,
        poolIds: [],
      };
    }
  }

  return null;
};

export const readJoinedPoolIdCache = (viewerAddress: string): string[] => {
  const entry = readJoinedPoolIdCacheEntry(viewerAddress);
  return entry?.poolIds ?? [];
};

export const writeJoinedPoolIdCache = (viewerAddress: string, poolIds: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = buildJoinedPoolCacheKey(viewerAddress);
  if (key.endsWith(':')) {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        poolIds,
      }),
    );
  } catch {
    // Ignore storage quota or serialization issues.
  }
};

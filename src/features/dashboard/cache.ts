import type { ApiGroup } from '../../services/groupsService';
import {
  DASHBOARD_GROUP_CACHE_KEY_PREFIX,
  DASHBOARD_JOINED_POOL_CACHE_KEY_PREFIX,
} from './constants';
import type { DashboardMode } from './types';

export const buildDashboardGroupCacheKey = (mode: DashboardMode, query: string): string =>
  `${DASHBOARD_GROUP_CACHE_KEY_PREFIX}:${mode}:${query.trim().toLowerCase()}`;

export const buildJoinedPoolCacheKey = (viewerAddress: string): string =>
  `${DASHBOARD_JOINED_POOL_CACHE_KEY_PREFIX}:${viewerAddress.trim().toLowerCase()}`;

export const readDashboardGroupCache = (mode: DashboardMode, query: string): ApiGroup[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildDashboardGroupCacheKey(mode, query));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { groups?: ApiGroup[] };
    if (!Array.isArray(parsed.groups)) {
      return null;
    }
    return parsed.groups;
  } catch {
    return null;
  }
};

export const writeDashboardGroupCache = (mode: DashboardMode, query: string, groups: ApiGroup[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      buildDashboardGroupCacheKey(mode, query),
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        groups,
      }),
    );
  } catch {
    // Ignore storage quota or serialization issues.
  }
};

export const readJoinedPoolIdCache = (viewerAddress: string): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const key = buildJoinedPoolCacheKey(viewerAddress);
  if (!key.endsWith(':')) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as { poolIds?: string[] };
      if (!Array.isArray(parsed.poolIds)) {
        return [];
      }
      return parsed.poolIds
        .map(item => String(item).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  return [];
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

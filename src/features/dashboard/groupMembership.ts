import { getAddress, isAddress } from 'viem';
import { type PublicClient } from 'viem';

import { POOL_ABI } from '../../contract/chainoraAbis';
import type { ApiGroup } from '../../services/groupsService';

const MULTICALL_CHUNK_SIZE = 50;

const chunk = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) {
    return [items];
  }
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

export const filterJoinedGroups = async (
  publicClient: PublicClient | undefined,
  groups: ApiGroup[],
  viewerAddress: string,
): Promise<ApiGroup[]> => {
  if (!publicClient || !isAddress(viewerAddress)) {
    return [];
  }

  const normalizedViewer = getAddress(viewerAddress);
  const indexedGroups = groups
    .map(group => ({ group, poolAddress: group.poolAddress.trim() }))
    .filter(item => isAddress(item.poolAddress))
    .map(item => ({ group: item.group, poolAddress: getAddress(item.poolAddress) }));

  if (indexedGroups.length === 0) {
    return [];
  }

  const visiblePoolIds = new Set<string>();

  for (const batch of chunk(indexedGroups, MULTICALL_CHUNK_SIZE)) {
    try {
      const results = await publicClient.multicall({
        contracts: batch.map(item => ({
          address: item.poolAddress,
          abi: POOL_ABI,
          functionName: 'isActiveMember',
          args: [normalizedViewer],
        })),
        allowFailure: true,
      });

      batch.forEach((item, index) => {
        const result = results[index];
        if (result?.status === 'success' && Boolean(result.result)) {
          visiblePoolIds.add(item.group.poolId.toLowerCase());
        }
      });
    } catch {
      const fallback = await Promise.all(
        batch.map(async item => {
          try {
            const active = await publicClient.readContract({
              address: item.poolAddress,
              abi: POOL_ABI,
              functionName: 'isActiveMember',
              args: [normalizedViewer],
            });
            return Boolean(active);
          } catch {
            return false;
          }
        }),
      );

      fallback.forEach((isActive, index) => {
        if (isActive) {
          visiblePoolIds.add(batch[index].group.poolId.toLowerCase());
        }
      });
    }
  }

  return groups.filter(group => visiblePoolIds.has(group.poolId.toLowerCase()));
};

export const filterJoinedGroupsWithTimeout = async (
  publicClient: PublicClient | undefined,
  groups: ApiGroup[],
  viewerAddress: string,
  timeoutMs: number,
): Promise<{ timedOut: boolean; groups: ApiGroup[] }> => {
  if (!publicClient || !isAddress(viewerAddress)) {
    return { timedOut: true, groups: [] };
  }

  let timer: number | null = null;

  const timeoutPromise = new Promise<{ timedOut: boolean; groups: ApiGroup[] }>(resolve => {
    timer = window.setTimeout(() => resolve({ timedOut: true, groups: [] }), timeoutMs);
  });

  const readPromise = filterJoinedGroups(publicClient, groups, viewerAddress)
    .then(result => ({ timedOut: false, groups: result }))
    .catch(() => ({ timedOut: false, groups: [] }));

  try {
    return await Promise.race([readPromise, timeoutPromise]);
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
};

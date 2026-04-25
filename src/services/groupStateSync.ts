import {
  fetchGroupByPoolId,
  fetchGroupDetailView,
  fetchGroupSyncStatus,
  type ApiGroup,
  type ApiGroupDetailView,
  type ApiGroupSyncStatus,
} from './groupsService';
import { walletDebugLog } from './walletDebugLog';

export type GroupSyncTarget = 'overview' | 'view';

export type SyncGroupStateAfterTxParams = {
  accessToken: string;
  poolId: string;
  targets?: GroupSyncTarget[];
};

export type SyncGroupStateAfterTxResult = {
  overview?: ApiGroup;
  view?: ApiGroupDetailView;
};

export type WaitForGroupProjectionSyncParams = {
  accessToken: string;
  poolId: string;
  txHash: string;
  timeoutMs?: number;
  intervalMs?: number;
};

export type WaitForGroupProjectionSyncResult = {
  applied: boolean;
  timedOut: boolean;
  status: ApiGroupSyncStatus;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => {
  window.setTimeout(resolve, ms);
});

const normalizeTargets = (targets?: GroupSyncTarget[]): GroupSyncTarget[] => {
  if (!targets || targets.length === 0) {
    return ['overview', 'view'];
  }

  const unique = new Set<GroupSyncTarget>();
  for (const target of targets) {
    if (target === 'overview' || target === 'view') {
      unique.add(target);
    }
  }

  return unique.size > 0 ? Array.from(unique) : ['overview', 'view'];
};

export const syncGroupStateAfterTx = async ({
  accessToken,
  poolId,
  targets,
}: SyncGroupStateAfterTxParams): Promise<SyncGroupStateAfterTxResult> => {
  const resolvedTargets = normalizeTargets(targets);
  const result: SyncGroupStateAfterTxResult = {};

  const tasks: Array<Promise<void>> = [];
  if (resolvedTargets.includes('overview')) {
    tasks.push((async () => {
      result.overview = await fetchGroupByPoolId(accessToken, poolId, {
        sync: true,
      });
    })());
  }
  if (resolvedTargets.includes('view')) {
    tasks.push((async () => {
      result.view = await fetchGroupDetailView(accessToken, poolId, {
        sync: true,
      });
    })());
  }

  const settled = await Promise.allSettled(tasks);
  const rejected = settled.find(item => item.status === 'rejected');
  if (rejected && rejected.status === 'rejected') {
    walletDebugLog.warn('groupStateSync.partial_failed', {
      poolId,
      message: rejected.reason instanceof Error ? rejected.reason.message : String(rejected.reason),
      targets: resolvedTargets.join(','),
    });
    return result;
  }

  walletDebugLog.info('groupStateSync.success', {
    poolId,
    targets: resolvedTargets.join(','),
  });
  return result;
};

export const waitForGroupProjectionSync = async ({
  accessToken,
  poolId,
  txHash,
  timeoutMs = 60_000,
  intervalMs = 2_000,
}: WaitForGroupProjectionSyncParams): Promise<WaitForGroupProjectionSyncResult> => {
  const deadline = Date.now() + Math.max(10_000, timeoutMs);
  let lastStatus = await fetchGroupSyncStatus(accessToken, poolId, txHash);
  if (lastStatus.applied) {
    return {
      applied: true,
      timedOut: false,
      status: lastStatus,
    };
  }

  while (Date.now() < deadline) {
    await sleep(Math.max(500, intervalMs));
    lastStatus = await fetchGroupSyncStatus(accessToken, poolId, txHash);
    if (lastStatus.applied) {
      walletDebugLog.info('groupStateSync.projection.applied', {
        poolId,
        txHash,
        lastIndexedBlock: lastStatus.lastIndexedBlock,
      });
      return {
        applied: true,
        timedOut: false,
        status: lastStatus,
      };
    }
  }

  walletDebugLog.warn('groupStateSync.projection.timeout', {
    poolId,
    txHash,
    lastIndexedBlock: lastStatus.lastIndexedBlock,
    stale: lastStatus.stale,
  });
  return {
    applied: false,
    timedOut: true,
    status: lastStatus,
  };
};

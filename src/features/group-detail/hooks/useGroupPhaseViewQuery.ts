import { useQuery } from '@tanstack/react-query';

import {
  fetchGroupDetailView,
  type ApiGroupDetailView,
} from '../../../services/groupsService';

type UseGroupPhaseViewQueryParams = {
  poolId: string;
  accessToken: string;
  enabled: boolean;
  refreshSession: () => Promise<string>;
  activeSelectionHint: boolean;
  sync: boolean;
};

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
};

const loadGroupPhaseView = async (
  accessToken: string,
  refreshSession: () => Promise<string>,
  params: {
    poolId: string;
    sync: boolean;
  },
): Promise<ApiGroupDetailView> => {
  try {
    return await fetchGroupDetailView(accessToken, params.poolId, {
      sync: params.sync,
    });
  } catch {
    const nextToken = await refreshSession();
    return fetchGroupDetailView(nextToken, params.poolId, {
      sync: params.sync,
    });
  }
};

export const useGroupPhaseViewQuery = ({
  poolId,
  accessToken,
  enabled,
  refreshSession,
  activeSelectionHint,
  sync,
}: UseGroupPhaseViewQueryParams) => {
  return useQuery({
    queryKey: ['group-phase-view', poolId],
    enabled,
    staleTime: activeSelectionHint ? 45_000 : 90_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: query => {
      if (!isDocumentVisible()) {
        return false;
      }

      const data = query.state.data as ApiGroupDetailView | undefined;
      if (!data) {
        return activeSelectionHint ? 30_000 : 90_000;
      }

      if (data.selection.isHistoricalView || data.selection.isFutureView) {
        const status = data.group?.groupStatus ?? '';
        if (
          status === 'funding'
          || status === 'bidding'
          || status === 'payout'
          || status === 'deadlinepassed'
          || status === 'ended_period'
          || status === 'voting_extension'
        ) {
          return 20_000;
        }
        return 180_000;
      }

      if (data.selection.isCurrentActivePhase) {
        const countdownSeconds = Math.max(0, Math.floor(data.phaseMeta?.countdownSeconds ?? 0));
        if (countdownSeconds <= 15) {
          return 2_000;
        }
        if (countdownSeconds <= 90) {
          return 5_000;
        }
        return 30_000;
      }

      return 60_000;
    },
    queryFn: () => loadGroupPhaseView(accessToken, refreshSession, {
      poolId,
      sync,
    }),
  });
};

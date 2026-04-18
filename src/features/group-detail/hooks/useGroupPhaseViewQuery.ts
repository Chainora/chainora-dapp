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
        return activeSelectionHint ? 45_000 : 90_000;
      }
      if (data.selection.isCurrentActivePhase) {
        return 60_000;
      }
      if (data.selection.isHistoricalView || data.selection.isFutureView) {
        return 180_000;
      }
      return 120_000;
    },
    queryFn: () => loadGroupPhaseView(accessToken, refreshSession, {
      poolId,
      sync: activeSelectionHint,
    }),
  });
};

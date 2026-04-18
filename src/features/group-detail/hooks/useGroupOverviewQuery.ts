import { useQuery } from '@tanstack/react-query';

import { fetchGroupByPoolId, type ApiGroup } from '../../../services/groupsService';

type UseGroupOverviewQueryParams = {
  poolId: string;
  accessToken: string;
  enabled: boolean;
  refreshSession: () => Promise<string>;
};

const loadGroupOverview = async (
  poolId: string,
  accessToken: string,
  refreshSession: () => Promise<string>,
): Promise<ApiGroup> => {
  try {
    return await fetchGroupByPoolId(accessToken, poolId, { sync: false });
  } catch {
    const nextToken = await refreshSession();
    return fetchGroupByPoolId(nextToken, poolId, { sync: false });
  }
};

export const useGroupOverviewQuery = ({
  poolId,
  accessToken,
  enabled,
  refreshSession,
}: UseGroupOverviewQueryParams) => {
  return useQuery({
    queryKey: ['group-detail', poolId],
    enabled,
    staleTime: 180_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: false,
    queryFn: () => loadGroupOverview(poolId, accessToken, refreshSession),
  });
};

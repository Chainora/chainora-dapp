import { useMemo } from 'react';

import type { GroupStatus } from '../../../services/groupStatus';
import type { GroupPhase } from '../../../services/groupsService';
import {
  buildPoolTimelineViewModel,
  type PoolTimelineViewModel,
} from '../model';

type UsePoolTimelineParams = {
  totalPeriods: number;
  currentPeriod: number;
  currentPhase: GroupPhase;
  selectedPeriod: number;
  groupStatus: GroupStatus;
  extendVoteOpen: boolean;
  extendYesVotes: string;
  extendRequiredVotes: number;
  currentCycle: number;
  cycleCompleted: boolean;
};

export const usePoolTimeline = (params: UsePoolTimelineParams): PoolTimelineViewModel => {
  return useMemo(
    () => buildPoolTimelineViewModel(params),
    [
      params.currentCycle,
      params.currentPeriod,
      params.currentPhase,
      params.cycleCompleted,
      params.extendRequiredVotes,
      params.extendVoteOpen,
      params.extendYesVotes,
      params.groupStatus,
      params.selectedPeriod,
      params.totalPeriods,
    ],
  );
};

export type { PoolTimelineViewModel } from '../model';

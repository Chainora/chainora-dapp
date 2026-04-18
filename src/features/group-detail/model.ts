import type {
  ApiGroup,
  ApiGroupDetailView,
  ApiGroupViewSelection,
  GroupPhase,
} from '../../services/groupsService';
import { deriveGroupStatus, type GroupStatus } from '../../services/groupStatus';

export type TimelineStepState = 'completed' | 'active' | 'locked';

export type TimelineStep = {
  phase: GroupPhase;
  label: string;
  state: TimelineStepState;
};

export type TimelinePeriod = {
  period: number;
  state: 'completed' | 'active' | 'upcoming';
  isSelected: boolean;
  steps: TimelineStep[];
};

export type PoolTimelineViewModel = {
  periods: TimelinePeriod[];
  extension: {
    state: 'locked' | 'active' | 'completed_continue' | 'completed_archive';
    yesVotes: number;
    requiredVotes: number;
  };
};

export const phaseLabel = (phase: GroupPhase): string => {
  switch (phase) {
    case 'funding':
      return 'Funding';
    case 'bidding':
      return 'Bidding';
    case 'payout':
      return 'Payout';
    case 'ending':
      return 'Ending';
    default:
      return phase;
  }
};

export const phaseOrder = (phase: GroupPhase): number => {
  switch (phase) {
    case 'funding':
      return 1;
    case 'bidding':
      return 2;
    case 'payout':
      return 3;
    case 'ending':
      return 4;
    default:
      return 0;
  }
};

export const phaseFromPeriodStatus = (status: number | null | undefined): GroupPhase => {
  switch (status) {
    case 0:
      return 'funding';
    case 1:
      return 'bidding';
    case 2:
      return 'payout';
    case 3:
      return 'ending';
    default:
      return 'funding';
  }
};

export const deriveActivePhase = (group: ApiGroup | null | undefined): GroupPhase => {
  if (!group) {
    return 'funding';
  }
  return phaseFromPeriodStatus(group.currentPeriodStatus ?? 0);
};

export const deriveLifecycleStatus = (group: ApiGroup | null | undefined): GroupStatus => {
  if (!group) {
    return 'forming';
  }

  return deriveGroupStatus({
    poolStatus: group.status,
    periodStatus: group.currentPeriodStatus,
    cycleCompleted: Boolean(group.cycleCompleted),
    extendVoteOpen: Boolean(group.extendVoteOpen),
    backendGroupStatus: group.groupStatus,
  });
};

export const getTotalPeriods = (group: ApiGroup | null | undefined): number => {
  if (!group) {
    return 1;
  }
  return Math.max(group.targetMembers || 0, group.activeMemberCount || 0, 1);
};

export const getCurrentPeriod = (group: ApiGroup | null | undefined): number => {
  if (!group) {
    return 1;
  }
  const parsed = Number.parseInt(group.currentPeriod ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const getCurrentCycle = (group: ApiGroup | null | undefined): number => {
  if (!group) {
    return 1;
  }
  const parsed = Number.parseInt(group.currentCycle ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const isSelectionCurrent = (selection: ApiGroupViewSelection | null | undefined): boolean =>
  Boolean(selection?.isCurrentActivePhase);

export const buildPoolTimelineViewModel = (params: {
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
}): PoolTimelineViewModel => {
  const steps: GroupPhase[] = ['funding', 'bidding', 'payout', 'ending'];
  const totalPeriods = Math.max(1, params.totalPeriods);
  const currentPeriod = Math.min(Math.max(params.currentPeriod, 1), totalPeriods);

  const periods: TimelinePeriod[] = Array.from({ length: totalPeriods }, (_, index) => {
    const period = index + 1;

    let state: TimelinePeriod['state'] = 'upcoming';
    if (params.groupStatus !== 'forming') {
      if (period < currentPeriod) {
        state = 'completed';
      } else if (period === currentPeriod) {
        state = 'active';
      }
    }

    const periodSteps: TimelineStep[] = steps.map(phase => {
      if (params.groupStatus === 'forming') {
        return { phase, label: phaseLabel(phase), state: 'locked' };
      }

      if (params.groupStatus === 'voting_extension' || params.groupStatus === 'archived') {
        return { phase, label: phaseLabel(phase), state: 'completed' };
      }

      if (period < currentPeriod) {
        return { phase, label: phaseLabel(phase), state: 'completed' };
      }

      if (period > currentPeriod) {
        return { phase, label: phaseLabel(phase), state: 'locked' };
      }

      const currentOrder = phaseOrder(params.currentPhase);
      const order = phaseOrder(phase);
      if (order < currentOrder) {
        return { phase, label: phaseLabel(phase), state: 'completed' };
      }
      if (order === currentOrder) {
        return { phase, label: phaseLabel(phase), state: 'active' };
      }
      return { phase, label: phaseLabel(phase), state: 'locked' };
    });

    return {
      period,
      state,
      isSelected: period === params.selectedPeriod,
      steps: periodSteps,
    };
  });

  let extensionState: PoolTimelineViewModel['extension']['state'] = 'locked';
  if (params.groupStatus === 'voting_extension' && params.extendVoteOpen) {
    extensionState = 'active';
  } else if (params.groupStatus === 'archived' && params.cycleCompleted) {
    extensionState = 'completed_archive';
  } else if (params.currentCycle > 1 && params.selectedPeriod === 1) {
    extensionState = 'completed_continue';
  }

  return {
    periods,
    extension: {
      state: extensionState,
      yesVotes: Number.parseInt(params.extendYesVotes || '0', 10) || 0,
      requiredVotes: Math.max(params.extendRequiredVotes || 0, 0),
    },
  };
};

export const resolveViewGroup = (
  overview: ApiGroup | undefined,
  view: ApiGroupDetailView | undefined,
): ApiGroup | undefined => view?.group ?? overview;

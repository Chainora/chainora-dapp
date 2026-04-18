export type PoolLifecyclePhase =
  | 'FORMING'
  | 'FUNDING'
  | 'BIDDING'
  | 'PAYOUT'
  | 'PERIOD_ENDED'
  | 'COMPLETED';

export type PoolLifecycleStep = {
  key: PoolLifecyclePhase;
  label: string;
};

export type PoolLifecycleSummary = {
  phase: PoolLifecyclePhase;
  label: string;
  stepIndex: number;
  steps: PoolLifecycleStep[];
};

export type GroupActionAvailability = {
  canLeaveDuringForming: boolean;
  canProposeInvite: boolean;
  canRequestJoin: boolean;
  canContribute: boolean;
  canSubmitBid: boolean;
  canCloseAuction: boolean;
  canClaimPayout: boolean;
  canFinalizePeriod: boolean;
  canClaimYield: boolean;
};

const PHASE_STEPS: PoolLifecycleStep[] = [
  { key: 'FORMING', label: 'Forming' },
  { key: 'FUNDING', label: 'Funding' },
  { key: 'BIDDING', label: 'Bidding' },
  { key: 'PAYOUT', label: 'Jumping/Payout' },
  { key: 'PERIOD_ENDED', label: 'Period Ended' },
  { key: 'COMPLETED', label: 'Completed/Archived' },
];

const PHASE_LABELS: Record<PoolLifecyclePhase, string> = {
  FORMING: 'Forming',
  FUNDING: 'Funding',
  BIDDING: 'Bidding',
  PAYOUT: 'Jumping/Payout',
  PERIOD_ENDED: 'Period Ended',
  COMPLETED: 'Completed/Archived',
};

export const derivePoolLifecyclePhase = (
  poolStatus: number,
  periodStatus: number | null | undefined,
): PoolLifecyclePhase => {
  if (poolStatus === 0) {
    return 'FORMING';
  }
  if (poolStatus === 2) {
    return 'COMPLETED';
  }

  switch (periodStatus) {
    case 1:
      return 'BIDDING';
    case 2:
      return 'PAYOUT';
    case 3:
      return 'PERIOD_ENDED';
    case 0:
    default:
      return 'FUNDING';
  }
};

export const describePoolLifecycle = (
  poolStatus: number,
  periodStatus: number | null | undefined,
): PoolLifecycleSummary => {
  const phase = derivePoolLifecyclePhase(poolStatus, periodStatus);
  const stepIndex = PHASE_STEPS.findIndex(step => step.key === phase);
  return {
    phase,
    label: PHASE_LABELS[phase],
    stepIndex: stepIndex >= 0 ? stepIndex : 0,
    steps: PHASE_STEPS,
  };
};

export const phaseRefreshProfile = (
  phase: PoolLifecyclePhase,
): {
  coreIntervalMs: number;
  heavyIntervalMs: number;
  backendIntervalMs: number;
} => {
  switch (phase) {
    case 'FORMING':
      return {
        coreIntervalMs: 18_000,
        heavyIntervalMs: 75_000,
        backendIntervalMs: 60_000,
      };
    case 'FUNDING':
    case 'BIDDING':
    case 'PAYOUT':
      return {
        coreIntervalMs: 9_000,
        heavyIntervalMs: 45_000,
        backendIntervalMs: 30_000,
      };
    case 'PERIOD_ENDED':
      return {
        coreIntervalMs: 14_000,
        heavyIntervalMs: 65_000,
        backendIntervalMs: 45_000,
      };
    case 'COMPLETED':
    default:
      return {
        coreIntervalMs: 25_000,
        heavyIntervalMs: 120_000,
        backendIntervalMs: 90_000,
      };
  }
};

export const resolveGroupActionAvailability = (params: {
  phase: PoolLifecyclePhase;
  isViewerMember: boolean;
  isViewerActiveMember: boolean;
  isPublicRecruitment: boolean;
}): GroupActionAvailability => {
  const {
    phase,
    isViewerMember,
    isViewerActiveMember,
    isPublicRecruitment,
  } = params;
  const isActiveMember = isViewerActiveMember || isViewerMember;

  return {
    canLeaveDuringForming: isActiveMember && phase === 'FORMING',
    canProposeInvite: isActiveMember && phase === 'FORMING',
    canRequestJoin: !isActiveMember && isPublicRecruitment && phase === 'FORMING',
    canContribute: isActiveMember && phase === 'FUNDING',
    canSubmitBid: isActiveMember && phase === 'BIDDING',
    canCloseAuction: isActiveMember && phase === 'BIDDING',
    canClaimPayout: isActiveMember && (phase === 'PAYOUT' || phase === 'PERIOD_ENDED'),
    canFinalizePeriod: isActiveMember && (phase === 'PAYOUT' || phase === 'PERIOD_ENDED'),
    canClaimYield: isActiveMember && phase === 'COMPLETED',
  };
};

import type { GroupPhase } from '../../services/groupsService';
import type { GroupStatus } from '../../services/groupStatus';

export type CompactUiPhase = 'forming' | 'funding' | 'bidding' | 'payout' | 'ending';
export type SupportRailTab = 'members' | 'votes';

export const compactUiConfig = {
  viewportHeightThreshold: 768,
  panelTabOrderByPhase: {
    forming: ['members', 'votes'],
    funding: ['members'],
    bidding: ['members'],
    payout: ['members'],
    ending: ['members'],
  } as Record<CompactUiPhase, SupportRailTab[]>,
} as const;

const phaseFromGroupPhase: Record<GroupPhase, CompactUiPhase> = {
  funding: 'funding',
  bidding: 'bidding',
  payout: 'payout',
  ending: 'ending',
};

export const resolveCompactUiPhase = (
  groupStatus: GroupStatus,
  activePhase: GroupPhase,
): CompactUiPhase => {
  // Active phase from backend is the source of truth for time-based transitions.
  // This ensures UI moves from payout -> ending as soon as payout countdown reaches 0.
  if (activePhase === 'ending') {
    if (groupStatus === 'forming') {
      return 'forming';
    }
    return 'ending';
  }

  switch (groupStatus) {
    case 'forming':
      return 'forming';
    case 'funding':
      return 'funding';
    case 'bidding':
      return 'bidding';
    case 'payout':
      return 'payout';
    case 'deadlinepassed':
    case 'ended_period':
    case 'voting_extension':
    case 'archived':
      return 'ending';
    case 'active':
    default:
      return phaseFromGroupPhase[activePhase];
  }
};

export const compactPhaseLabel = (phase: CompactUiPhase): string => {
  switch (phase) {
    case 'forming':
      return 'Forming';
    case 'funding':
      return 'Funding';
    case 'bidding':
      return 'Bidding';
    case 'payout':
      return 'Payout';
    case 'ending':
      return 'Ending';
    default:
      return 'Funding';
  }
};

export const supportTabLabel = (tab: SupportRailTab, phase?: CompactUiPhase): string => {
  switch (tab) {
    case 'members':
      return 'Members';
    case 'votes':
      return phase === 'forming' ? 'Invites / Requests' : 'Votes';
    default:
      return 'Members';
  }
};

import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
  ApiGroupViewPhaseMeta,
  GroupPhase,
} from '../../../services/groupsService';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';
import { BiddingPhasePanel } from './BiddingPhasePanel';
import { EndingPhasePanel } from './EndingPhasePanel';
import { FundingPhasePanel } from './FundingPhasePanel';
import { PayoutPhasePanel } from './PayoutPhasePanel';

export function PhaseContentRenderer({
  selectedPhase,
  periodMeta,
  phaseMeta,
  memberStates,
  permissions,
  isActing,
  contributionLabel,
  bidDiscountInput,
  onBidDiscountChange,
  claimableYieldLabel,
  onContribute,
  onSubmitBid,
  onCloseAuction,
  onClaim,
  onFinalize,
  onVoteContinue,
  onVoteEnd,
  onClaimYield,
  isVotingExtension,
}: {
  selectedPhase: GroupPhase;
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  memberStates: ApiGroupViewMemberState[];
  permissions: PhasePermissionViewModel;
  isActing: boolean;
  contributionLabel: string;
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  claimableYieldLabel: string;
  onContribute: () => void;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
  onClaim: () => void;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onClaimYield: () => void;
  isVotingExtension: boolean;
}) {
  if (selectedPhase === 'funding') {
    return (
      <FundingPhasePanel
        periodMeta={periodMeta}
        phaseMeta={phaseMeta}
        memberStates={memberStates}
        contributionLabel={contributionLabel}
        canContribute={permissions.canContribute}
        disabledReason={permissions.disabledReason}
        isActing={isActing}
        onContribute={onContribute}
      />
    );
  }

  if (selectedPhase === 'bidding') {
    return (
      <BiddingPhasePanel
        periodMeta={periodMeta}
        phaseMeta={phaseMeta}
        memberStates={memberStates}
        bidDiscountInput={bidDiscountInput}
        onBidDiscountChange={onBidDiscountChange}
        canBid={permissions.canBid}
        canCloseAuction={permissions.canCloseAuction}
        disabledReason={permissions.disabledReason}
        isActing={isActing}
        onSubmitBid={onSubmitBid}
        onCloseAuction={onCloseAuction}
      />
    );
  }

  if (selectedPhase === 'payout') {
    return (
      <PayoutPhasePanel
        periodMeta={periodMeta}
        phaseMeta={phaseMeta}
        memberStates={memberStates}
        canClaim={permissions.canClaim}
        disabledReason={permissions.disabledReason}
        isActing={isActing}
        onClaim={onClaim}
        claimableYieldLabel={claimableYieldLabel}
      />
    );
  }

  return (
    <EndingPhasePanel
      periodMeta={periodMeta}
      phaseMeta={phaseMeta}
      canFinalize={permissions.canFinalize}
      canVoteContinue={permissions.canVoteContinue}
      canVoteEnd={permissions.canVoteEnd}
      canClaimYield={permissions.canClaimYield}
      disabledReason={permissions.disabledReason}
      isActing={isActing}
      onFinalize={onFinalize}
      onVoteContinue={onVoteContinue}
      onVoteEnd={onVoteEnd}
      onClaimYield={onClaimYield}
      isVotingExtension={isVotingExtension}
    />
  );
}

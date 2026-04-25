import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import type { GroupStatus } from '../../../services/groupStatus';
import { Button } from '../../../components/ui/Button';
import { compactPhaseLabel, type CompactUiPhase } from '../compactConfig';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';
import { formatToken } from '../utils';
import { StatusBadge } from './StatusBadge';

const innerSurfaceStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

export function PhasePrimaryPanel({
  uiPhase,
  groupStatus,
  periodMeta,
  memberStates,
  permissions,
  isViewerMember,
  isConnected,
  isActing,
  canProposeInvite,
  canLeaveDuringForming,
  candidateAddress,
  canConfirmJoin,
  confirmJoinLabel,
  canRequestJoin,
  requestJoinDisabledReason,
  contributionLabel,
  bidDiscountInput,
  onBidDiscountChange,
  onCandidateAddressChange,
  onProposeInvite,
  onLeaveDuringForming,
  onRequestJoin,
  onContribute,
  onSubmitBid,
  onClaim,
  onFinalize,
  onVoteContinue,
  onVoteEnd,
  onConfirmJoin,
}: {
  uiPhase: CompactUiPhase;
  groupStatus: GroupStatus;
  periodMeta: ApiGroupViewPeriodMeta | undefined;
  memberStates: ApiGroupViewMemberState[];
  permissions: PhasePermissionViewModel;
  isViewerMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  canProposeInvite: boolean;
  canLeaveDuringForming: boolean;
  candidateAddress: string;
  canConfirmJoin: boolean;
  confirmJoinLabel: string;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
  contributionLabel: string;
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  onCandidateAddressChange: (value: string) => void;
  onProposeInvite: (candidateAddress: string) => void;
  onLeaveDuringForming: () => void;
  onRequestJoin: () => void;
  onContribute: () => void;
  onSubmitBid: () => void;
  onClaim: () => void;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onConfirmJoin: () => void;
}) {
  const paidCount = memberStates.filter(member => member.state === 'paid').length;
  const totalMembers = memberStates.length;
  const bestDiscount = formatToken(periodMeta?.bestDiscount ?? '0');
  const inviteDisabledReason = !isConnected
    ? 'Connect wallet to invite.'
    : !canProposeInvite
      ? 'Only active members can invite during forming.'
      : candidateAddress.trim() === ''
        ? 'Enter candidate username or wallet.'
        : '';

  if (uiPhase === 'forming') {
    return (
      <article className="card-raised flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 c-1">Forming Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="warning" />
        </div>
        <p className="t-small c-2 mt-2">
          {isViewerMember
            ? 'Group is collecting members. Invite candidates here and monitor votes in support rail.'
            : 'Group is forming. Request to join if recruitment is still open.'}
        </p>

        <div className="mt-auto space-y-3 pt-4">
          {isViewerMember ? (
            <>
              <input
                value={candidateAddress}
                onChange={event => onCandidateAddressChange(event.target.value)}
                placeholder="Candidate username / init / 0x wallet"
                className="input"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!isConnected || isActing || !canProposeInvite || candidateAddress.trim() === ''}
                onClick={() => onProposeInvite(candidateAddress)}
                title={inviteDisabledReason || undefined}
                className="w-full"
              >
                {isActing ? 'Preparing...' : 'Invite Candidate'}
              </Button>
              {inviteDisabledReason ? <p className="t-tiny c-3">{inviteDisabledReason}</p> : null}
              <Button
                type="button"
                variant="ghost"
                disabled={!canLeaveDuringForming || isActing}
                onClick={onLeaveDuringForming}
                title={!canLeaveDuringForming ? 'Leave is only available while group is forming.' : undefined}
                className="w-full"
                style={{
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: 'var(--risk-300)',
                  background: 'var(--risk-bg)',
                }}
              >
                {isActing ? 'Preparing...' : 'Out Group'}
              </Button>
            </>
          ) : null}

          {!isViewerMember && canConfirmJoin ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isActing}
              onClick={onConfirmJoin}
              className="w-full"
            >
              {isActing ? 'Preparing...' : confirmJoinLabel}
            </Button>
          ) : null}
          {!isViewerMember && !canConfirmJoin ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!canRequestJoin || isActing}
              onClick={onRequestJoin}
              title={!canRequestJoin ? requestJoinDisabledReason : undefined}
              className="w-full"
            >
              {isActing ? 'Preparing...' : 'Request to Join'}
            </Button>
          ) : null}
          {!isViewerMember && !canConfirmJoin && !canRequestJoin ? (
            <p className="t-tiny c-3">{requestJoinDisabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'funding') {
    return (
      <article className="card-raised flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 c-1">Funding Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="t-small c-2 mt-2">Contribute for this period and keep the pool moving.</p>

        <div className="mt-4 p-3" style={innerSurfaceStyle}>
          <p className="t-label">Contribution amount</p>
          <p className="t-body c-1 t-num mt-1 font-bold">{contributionLabel}</p>
          <p className="t-tiny c-3 mt-1">
            Paid members: {paidCount}/{totalMembers}
          </p>
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={!permissions.canContribute || isActing}
            onClick={onContribute}
            title={!permissions.canContribute ? permissions.disabledReason : undefined}
            className="w-full"
          >
            {isActing ? 'Preparing...' : 'Contribute'}
          </Button>
          {!permissions.canContribute && permissions.disabledReason ? (
            <p className="t-tiny c-3">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'bidding') {
    const canPrimaryBid = permissions.canBid;

    return (
      <article className="card-raised flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 c-1">Bidding Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="t-small c-2 mt-2">Submit your discount bid for this period auction.</p>

        {canPrimaryBid ? (
          <div className="mt-4 p-3" style={innerSurfaceStyle}>
            <label htmlFor="compact-bid-discount" className="t-label">
              Discount bid
            </label>
            <input
              id="compact-bid-discount"
              value={bidDiscountInput}
              onChange={event => onBidDiscountChange(event.target.value)}
              inputMode="numeric"
              placeholder="Enter discount"
              className="input mt-2"
            />
            <p className="t-tiny c-3 mt-2">
              Best discount now: <span className="t-mono c-1">{bestDiscount}</span>
            </p>
            <p className="t-tiny c-3">Your bid must be greater than current best discount.</p>
          </div>
        ) : null}

        <div className="mt-auto space-y-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={!canPrimaryBid || isActing}
            onClick={onSubmitBid}
            title={!canPrimaryBid ? permissions.disabledReason : undefined}
            className="w-full"
          >
            {isActing ? 'Preparing...' : 'Submit Bid'}
          </Button>
          {!canPrimaryBid && permissions.disabledReason ? (
            <p className="t-tiny c-3">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'payout') {
    return (
      <article className="card-raised flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 c-1">Payout Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="t-small c-2 mt-2">
          Recipient claims payout in this phase. If recipient does not claim before period end, ending phase can finalize and auto-transfer payout.
        </p>

        <div className="mt-4 p-3" style={innerSurfaceStyle}>
          <p className="t-label">Payout amount</p>
          <p className="t-body c-1 t-num mt-1 font-bold">{formatToken(periodMeta?.payoutAmount ?? '0')}</p>
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={!permissions.canClaim || isActing}
            onClick={onClaim}
            title={!permissions.canClaim ? permissions.disabledReason : undefined}
            className="w-full"
          >
            {isActing ? 'Preparing...' : 'Claim Payout'}
          </Button>
          {!permissions.canClaim && permissions.disabledReason ? (
            <p className="t-tiny c-3">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (groupStatus === 'voting_extension') {
    return (
      <article className="card-raised flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 c-1">Extension Decision</h2>
          <StatusBadge label="Voting Extension" tone="warning" />
        </div>
        <p className="t-small c-2 mt-2">Choose whether to continue a new cycle or end and archive.</p>

        <div className="mt-auto grid gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={!permissions.canVoteContinue || isActing}
            onClick={onVoteContinue}
            title={!permissions.canVoteContinue ? permissions.disabledReason : undefined}
            className="w-full"
            style={{
              borderColor: 'rgba(16,185,129,0.4)',
              color: 'var(--ok-300)',
              background: 'var(--ok-bg)',
            }}
          >
            {isActing ? 'Preparing...' : 'Vote Continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!permissions.canVoteEnd || isActing}
            onClick={onVoteEnd}
            title={!permissions.canVoteEnd ? permissions.disabledReason : undefined}
            className="w-full"
            style={{
              borderColor: 'rgba(245,158,11,0.4)',
              color: 'var(--warn-300)',
              background: 'var(--warn-bg)',
            }}
          >
            {isActing ? 'Preparing...' : 'Vote End'}
          </Button>
          {!permissions.canVoteContinue && !permissions.canVoteEnd && permissions.disabledReason ? (
            <p className="t-tiny c-3">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="card-raised flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-h4 c-1">Ending Workspace</h2>
        <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
      </div>
      <p className="t-small c-2 mt-2">
        Any active member can sync runtime after payout deadline. This transition auto-settles unclaimed payout to recipient, then opens the next period.
      </p>

      <div className="mt-auto space-y-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={!permissions.canFinalize || isActing}
          onClick={onFinalize}
          title={!permissions.canFinalize ? permissions.disabledReason : undefined}
          className="w-full"
        >
          {isActing ? 'Preparing...' : 'Sync Runtime'}
        </Button>
        {!permissions.canFinalize && permissions.disabledReason ? (
          <p className="t-tiny c-3">{permissions.disabledReason}</p>
        ) : null}
      </div>
    </article>
  );
}

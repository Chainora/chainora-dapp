import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import type { GroupStatus } from '../../../services/groupStatus';
import { compactPhaseLabel, type CompactUiPhase } from '../compactConfig';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';
import { formatToken } from '../utils';
import { StatusBadge } from './StatusBadge';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

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
  onCloseAuction,
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
  onCloseAuction: () => void;
  onClaim: () => void;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onConfirmJoin: () => void;
}) {
  const paidCount = memberStates.filter(member => member.state === 'paid').length;
  const totalMembers = memberStates.length;
  const bestDiscount = periodMeta?.bestDiscount ?? '0';
  const inviteDisabledReason = !isConnected
    ? 'Connect wallet to invite.'
    : !canProposeInvite
      ? 'Only active members can invite during forming.'
      : candidateAddress.trim() === ''
        ? 'Enter candidate username or wallet.'
        : '';

  if (uiPhase === 'forming') {
    return (
      <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Forming Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="warning" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {isViewerMember
            ? 'Group is collecting members. Invite candidates here and monitor votes in support rail.'
            : 'Group is forming. Request to join if recruitment is still open.'}
        </p>

        <div className="mt-auto space-y-3">
          {isViewerMember ? (
            <>
              <input
                value={candidateAddress}
                onChange={event => onCandidateAddressChange(event.target.value)}
                placeholder="Candidate username / init / 0x wallet"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              />
              <button
                type="button"
                disabled={!isConnected || isActing || !canProposeInvite || candidateAddress.trim() === ''}
                onClick={() => onProposeInvite(candidateAddress)}
                title={inviteDisabledReason || undefined}
                className={`w-full ${primaryButtonClass}`}
              >
                {isActing ? 'Preparing...' : 'Invite Candidate'}
              </button>
              {inviteDisabledReason ? (
                <p className="text-xs text-slate-500">{inviteDisabledReason}</p>
              ) : null}
              <button
                type="button"
                disabled={!canLeaveDuringForming || isActing}
                onClick={onLeaveDuringForming}
                title={!canLeaveDuringForming ? 'Leave is only available while group is forming.' : undefined}
                className="w-full rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActing ? 'Preparing...' : 'Out Group'}
              </button>
            </>
          ) : null}

          {!isViewerMember && canConfirmJoin ? (
            <button
              type="button"
              disabled={isActing}
              onClick={onConfirmJoin}
              className={`w-full ${primaryButtonClass}`}
            >
              {isActing ? 'Preparing...' : confirmJoinLabel}
            </button>
          ) : null}
          {!isViewerMember && !canConfirmJoin ? (
            <button
              type="button"
              disabled={!canRequestJoin || isActing}
              onClick={onRequestJoin}
              title={!canRequestJoin ? requestJoinDisabledReason : undefined}
              className={`w-full ${primaryButtonClass}`}
            >
              {isActing ? 'Preparing...' : 'Request to Join'}
            </button>
          ) : null}
          {!isViewerMember && !canConfirmJoin && !canRequestJoin ? (
            <p className="text-xs text-slate-500">{requestJoinDisabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'funding') {
    return (
      <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Funding Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="mt-2 text-sm text-slate-600">Contribute for this period and keep the pool moving.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Contribution amount</p>
          <p className="mt-1 text-base font-bold text-slate-900">{contributionLabel}</p>
          <p className="mt-1 text-xs text-slate-600">
            Paid members: {paidCount}/{totalMembers}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            disabled={!permissions.canContribute || isActing}
            onClick={onContribute}
            title={!permissions.canContribute ? permissions.disabledReason : undefined}
            className={`w-full ${primaryButtonClass}`}
          >
            {isActing ? 'Preparing...' : 'Contribute'}
          </button>
          {!permissions.canContribute && permissions.disabledReason ? (
            <p className="text-xs text-slate-500">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'bidding') {
    const canPrimaryBid = permissions.canBid;
    const canPrimaryClose = !canPrimaryBid && permissions.canCloseAuction;
    const canDoPrimary = canPrimaryBid || canPrimaryClose;
    const primaryLabel = canPrimaryBid ? 'Submit Bid' : 'Sync Runtime';
    const onPrimaryClick = canPrimaryBid ? onSubmitBid : onCloseAuction;

    return (
      <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Bidding Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="mt-2 text-sm text-slate-600">Submit your discount bid for this period auction.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label htmlFor="compact-bid-discount" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Discount bid
          </label>
          <input
            id="compact-bid-discount"
            value={bidDiscountInput}
            onChange={event => onBidDiscountChange(event.target.value)}
            inputMode="numeric"
            placeholder="Enter discount"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <p className="mt-2 text-xs text-slate-600">Best discount now: {bestDiscount}</p>
          <p className="text-xs text-slate-500">Your bid must be greater than current best discount.</p>
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            disabled={!canDoPrimary || isActing}
            onClick={onPrimaryClick}
            title={!canDoPrimary ? permissions.disabledReason : undefined}
            className={`w-full ${primaryButtonClass}`}
          >
            {isActing ? 'Preparing...' : primaryLabel}
          </button>
          {!canDoPrimary && permissions.disabledReason ? (
            <p className="text-xs text-slate-500">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (uiPhase === 'payout') {
    return (
      <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Payout Workspace</h2>
          <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Recipient claims payout in this phase. If recipient does not claim before period end, ending phase can finalize and auto-transfer payout.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Payout amount</p>
          <p className="mt-1 text-base font-bold text-slate-900">{formatToken(periodMeta?.payoutAmount ?? '0')}</p>
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            disabled={!permissions.canClaim || isActing}
            onClick={onClaim}
            title={!permissions.canClaim ? permissions.disabledReason : undefined}
            className={`w-full ${primaryButtonClass}`}
          >
            {isActing ? 'Preparing...' : 'Claim Payout'}
          </button>
          {!permissions.canClaim && permissions.disabledReason ? (
            <p className="text-xs text-slate-500">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (groupStatus === 'voting_extension') {
    return (
      <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Extension Decision</h2>
          <StatusBadge label="Voting Extension" tone="warning" />
        </div>
        <p className="mt-2 text-sm text-slate-600">Choose whether to continue a new cycle or end and archive.</p>

        <div className="mt-auto grid gap-2">
          <button
            type="button"
            disabled={!permissions.canVoteContinue || isActing}
            onClick={onVoteContinue}
            title={!permissions.canVoteContinue ? permissions.disabledReason : undefined}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActing ? 'Preparing...' : 'Vote Continue'}
          </button>
          <button
            type="button"
            disabled={!permissions.canVoteEnd || isActing}
            onClick={onVoteEnd}
            title={!permissions.canVoteEnd ? permissions.disabledReason : undefined}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActing ? 'Preparing...' : 'Vote End'}
          </button>
          {!permissions.canVoteContinue && !permissions.canVoteEnd && permissions.disabledReason ? (
            <p className="text-xs text-slate-500">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Ending Workspace</h2>
        <StatusBadge label={compactPhaseLabel(uiPhase)} tone="info" />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Any active member can sync runtime after payout deadline. This transition auto-settles unclaimed payout to recipient, then opens the next period.
      </p>

      <div className="mt-auto space-y-2">
        <button
          type="button"
          disabled={!permissions.canFinalize || isActing}
          onClick={onFinalize}
          title={!permissions.canFinalize ? permissions.disabledReason : undefined}
          className={`w-full ${primaryButtonClass}`}
        >
          {isActing ? 'Preparing...' : 'Sync Runtime'}
        </button>
        {!permissions.canFinalize && permissions.disabledReason ? (
          <p className="text-xs text-slate-500">{permissions.disabledReason}</p>
        ) : null}
      </div>
    </article>
  );
}

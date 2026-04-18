import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
  ApiGroupViewPhaseMeta,
} from '../../../services/groupsService';
import { PhaseCountdown } from './PhaseCountdown';
import { StatusBadge } from './StatusBadge';

export function PayoutPhasePanel({
  periodMeta,
  phaseMeta,
  memberStates,
  canClaim,
  disabledReason,
  isActing,
  onClaim,
  claimableYieldLabel,
}: {
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  memberStates: ApiGroupViewMemberState[];
  canClaim: boolean;
  disabledReason: string;
  isActing: boolean;
  onClaim: () => void;
  claimableYieldLabel: string;
}) {
  const recipient = memberStates.find(member => member.state === 'recipient_pending' || member.state === 'recipient_claimed');
  const isClaimed = Boolean(periodMeta.payoutClaimed || recipient?.state === 'recipient_claimed');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Payout Phase</h3>
        <PhaseCountdown
          phaseStatus={phaseMeta.phaseStatus}
          countdownSeconds={phaseMeta.countdownSeconds}
          countdownLabel={phaseMeta.countdownLabel}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Payout recipient</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{recipient?.address || periodMeta.recipient || 'Not selected'}</p>
          <p className="mt-2 text-sm text-slate-700">Payout amount: {periodMeta.payoutAmount}</p>
          <p className="text-sm text-slate-700">Claimable yield: {claimableYieldLabel}</p>
          <div className="mt-2">
            <StatusBadge label={isClaimed ? 'Payout claimed' : 'Payout pending'} tone={isClaimed ? 'success' : 'warning'} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Action</p>
          <button
            type="button"
            disabled={!canClaim || isActing}
            onClick={onClaim}
            title={!canClaim ? disabledReason : undefined}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Claim Payout
          </button>
          {!canClaim && disabledReason ? <p className="mt-2 text-xs text-slate-500">{disabledReason}</p> : null}
        </div>
      </div>
    </article>
  );
}

import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
  ApiGroupViewPhaseMeta,
} from '../../../services/groupsService';
import { StatusBadge } from './StatusBadge';
import { PhaseCountdown } from './PhaseCountdown';

export function FundingPhasePanel({
  periodMeta,
  phaseMeta,
  memberStates,
  contributionLabel,
  canContribute,
  disabledReason,
  isActing,
  onContribute,
}: {
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  memberStates: ApiGroupViewMemberState[];
  contributionLabel: string;
  canContribute: boolean;
  disabledReason: string;
  isActing: boolean;
  onContribute: () => void;
}) {
  const paidCount = memberStates.filter(member => member.state === 'paid').length;
  const unpaidCount = Math.max(memberStates.length - paidCount, 0);
  const viewerPaid = memberStates.some(member => member.isCurrentUser && member.state === 'paid');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Funding Phase</h3>
        <PhaseCountdown
          phaseStatus={phaseMeta.phaseStatus}
          countdownSeconds={phaseMeta.countdownSeconds}
          countdownLabel={phaseMeta.countdownLabel}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Contribution amount</p>
          <p className="mt-1 text-base font-bold text-slate-900">{contributionLabel}</p>
          <p className="mt-2 text-sm text-slate-600">Deadline: {periodMeta.contributionDeadline > 0 ? new Date(periodMeta.contributionDeadline * 1000).toLocaleString() : 'N/A'}</p>
          <div className="mt-2">
            <StatusBadge label={viewerPaid ? 'You paid' : 'You have not paid'} tone={viewerPaid ? 'success' : 'warning'} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Member funding status</p>
          <p className="mt-1 text-sm text-slate-700">Paid: {paidCount}</p>
          <p className="text-sm text-slate-700">Unpaid: {unpaidCount}</p>
          <button
            type="button"
            disabled={!canContribute || isActing}
            onClick={onContribute}
            title={!canContribute ? disabledReason : undefined}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActing ? 'Preparing...' : 'Contribute'}
          </button>
          {!canContribute && disabledReason ? <p className="mt-2 text-xs text-slate-500">{disabledReason}</p> : null}
        </div>
      </div>
    </article>
  );
}

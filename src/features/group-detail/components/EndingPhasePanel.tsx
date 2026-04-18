import type {
  ApiGroupViewPeriodMeta,
  ApiGroupViewPhaseMeta,
} from '../../../services/groupsService';
import { PhaseCountdown } from './PhaseCountdown';
import { StatusBadge } from './StatusBadge';

export function EndingPhasePanel({
  periodMeta,
  phaseMeta,
  canFinalize,
  canVoteContinue,
  canVoteEnd,
  canClaimYield,
  disabledReason,
  isActing,
  onFinalize,
  onVoteContinue,
  onVoteEnd,
  onClaimYield,
  isVotingExtension,
}: {
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  canFinalize: boolean;
  canVoteContinue: boolean;
  canVoteEnd: boolean;
  canClaimYield: boolean;
  disabledReason: string;
  isActing: boolean;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onClaimYield: () => void;
  isVotingExtension: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Ending Phase</h3>
        <PhaseCountdown
          phaseStatus={phaseMeta.phaseStatus}
          countdownSeconds={phaseMeta.countdownSeconds}
          countdownLabel={phaseMeta.countdownLabel}
        />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Period summary</p>
        <p className="mt-1 text-sm text-slate-700">Status: {periodMeta.statusLabel}</p>
        <p className="text-sm text-slate-700">Total contributed: {periodMeta.totalContributed}</p>
        <p className="text-sm text-slate-700">Period end: {periodMeta.periodEndAt > 0 ? new Date(periodMeta.periodEndAt * 1000).toLocaleString() : 'N/A'}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canFinalize || isActing}
          onClick={onFinalize}
          title={!canFinalize ? disabledReason : undefined}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Finalize Period
        </button>

        {isVotingExtension ? (
          <>
            <button
              type="button"
              disabled={!canVoteContinue || isActing}
              onClick={onVoteContinue}
              title={!canVoteContinue ? disabledReason : undefined}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Vote Continue
            </button>
            <button
              type="button"
              disabled={!canVoteEnd || isActing}
              onClick={onVoteEnd}
              title={!canVoteEnd ? disabledReason : undefined}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Vote End
            </button>
          </>
        ) : null}

        <button
          type="button"
          disabled={!canClaimYield || isActing}
          onClick={onClaimYield}
          title={!canClaimYield ? disabledReason : undefined}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Claim Yield
        </button>
      </div>

      {!canFinalize && !canVoteContinue && !canVoteEnd && !canClaimYield && disabledReason ? (
        <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>
      ) : null}

      {isVotingExtension ? (
        <div className="mt-2">
          <StatusBadge label="Voting extension phase" tone="warning" />
        </div>
      ) : null}
    </article>
  );
}

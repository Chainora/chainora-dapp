type PayoutSectionProps = {
  enabled: boolean;
  canClaimYield: boolean;
  canVoteExtend: boolean;
  isActing: boolean;
  onClaimPayout: () => void;
  onFinalizePeriod: () => void;
  onClaimYield: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
};

const secondaryClass =
  'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export function PayoutSection({
  enabled,
  canClaimYield,
  canVoteExtend,
  isActing,
  onClaimPayout,
  onFinalizePeriod,
  onClaimYield,
  onVoteContinue,
  onVoteEnd,
}: PayoutSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">Payout & Settlement</p>
      <p className="mt-1 text-xs text-slate-500">Claim payout, finalize period, vote extension, or claim yield after archive.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isActing || !enabled}
          onClick={onClaimPayout}
          className={secondaryClass}
        >
          Claim Payout
        </button>
        <button
          type="button"
          disabled={isActing || !enabled}
          onClick={onFinalizePeriod}
          className={secondaryClass}
        >
          Finalize
        </button>
        <button
          type="button"
          disabled={isActing || !canVoteExtend}
          onClick={onVoteContinue}
          className={secondaryClass}
        >
          Vote Continue
        </button>
        <button
          type="button"
          disabled={isActing || !canVoteExtend}
          onClick={onVoteEnd}
          className={secondaryClass}
        >
          Vote End
        </button>
      </div>
      <button
        type="button"
        disabled={isActing || !canClaimYield}
        onClick={onClaimYield}
        className={`mt-2 w-full ${secondaryClass}`}
      >
        Claim Yield
      </button>
    </div>
  );
}

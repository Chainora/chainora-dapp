type FundingSectionProps = {
  enabled: boolean;
  isActing: boolean;
  onContribute: () => void;
};

const buttonClass =
  'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export function FundingSection({ enabled, isActing, onContribute }: FundingSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">Funding</p>
      <p className="mt-1 text-xs text-slate-500">Pay this period contribution to stay eligible.</p>
      <button
        type="button"
        disabled={isActing || !enabled}
        onClick={onContribute}
        className={`mt-3 w-full ${buttonClass}`}
      >
        Deposit Contribution
      </button>
    </div>
  );
}

type BiddingSectionProps = {
  enabled: boolean;
  isActing: boolean;
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
};

const primaryClass =
  'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export function BiddingSection({
  enabled,
  isActing,
  bidDiscountInput,
  onBidDiscountChange,
  onSubmitBid,
  onCloseAuction,
}: BiddingSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">Bidding</p>
      <p className="mt-1 text-xs text-slate-500">Submit discount bids or close auction after deadline.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={bidDiscountInput}
          onChange={event => onBidDiscountChange(event.target.value)}
          placeholder="Bid discount (wei)"
          disabled={isActing || !enabled}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          disabled={isActing || !enabled}
          onClick={onSubmitBid}
          className={primaryClass}
        >
          Submit
        </button>
      </div>
      <button
        type="button"
        disabled={isActing || !enabled}
        onClick={onCloseAuction}
        className={`mt-2 w-full ${primaryClass}`}
      >
        Close Auction
      </button>
    </div>
  );
}

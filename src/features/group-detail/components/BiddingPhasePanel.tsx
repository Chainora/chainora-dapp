import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
  ApiGroupViewPhaseMeta,
} from '../../../services/groupsService';
import { formatToken } from '../utils';
import { PhaseCountdown } from './PhaseCountdown';
import { StatusBadge } from './StatusBadge';

export function BiddingPhasePanel({
  periodMeta,
  phaseMeta,
  memberStates,
  bidDiscountInput,
  onBidDiscountChange,
  canBid,
  canCloseAuction,
  disabledReason,
  isActing,
  onSubmitBid,
  onCloseAuction,
}: {
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  memberStates: ApiGroupViewMemberState[];
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  canBid: boolean;
  canCloseAuction: boolean;
  disabledReason: string;
  isActing: boolean;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
}) {
  const eligibleCount = memberStates.filter(member => member.state === 'eligible').length;
  const bestBidder = memberStates.find(member => member.state === 'best_bidder');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Bidding Phase</h3>
        <PhaseCountdown
          phaseStatus={phaseMeta.phaseStatus}
          countdownSeconds={phaseMeta.countdownSeconds}
          countdownLabel={phaseMeta.countdownLabel}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current auction</p>
          <p className="mt-1 text-sm text-slate-700">Eligible members: {eligibleCount}</p>
          <p className="text-sm text-slate-700">
            Best bidder: {bestBidder ? bestBidder.address : periodMeta.bestBidder || 'Not selected'}
          </p>
          <p className="text-sm text-slate-700">Best discount: {formatToken(periodMeta.bestDiscount)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500" htmlFor="bid-discount-input">
            Discount bid
          </label>
          <input
            id="bid-discount-input"
            value={bidDiscountInput}
            onChange={event => onBidDiscountChange(event.target.value)}
            inputMode="numeric"
            placeholder="Enter discount"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canBid || isActing}
              onClick={onSubmitBid}
              title={!canBid ? disabledReason : undefined}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit Bid
            </button>
            <button
              type="button"
              disabled={!canCloseAuction || isActing}
              onClick={onCloseAuction}
              title={!canCloseAuction ? disabledReason : undefined}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close Auction
            </button>
          </div>
          {!canBid && !canCloseAuction && disabledReason ? (
            <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>
          ) : null}
          {bestBidder ? (
            <div className="mt-2">
              <StatusBadge label="Best bidder selected" tone="success" />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

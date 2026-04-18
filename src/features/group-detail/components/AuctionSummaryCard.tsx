import { Glyph } from '../../../components/group-detail/Glyph';
import { formatAddress } from '../utils';

export function AuctionSummaryCard({
  currentPeriod,
  totalRoundPayoutLabel,
  bestBidLabel,
  recipientLabel,
  payoutStatusLabel,
}: {
  currentPeriod: string;
  totalRoundPayoutLabel: string;
  bestBidLabel: string;
  recipientLabel: string;
  payoutStatusLabel: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Glyph name="auction" className="h-4 w-4" />
          </span>
          Auction payout
        </h2>
        <p className="mt-1 text-sm text-slate-500">Round {currentPeriod} - Highest bidder wins</p>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-2xl font-black text-slate-900">{totalRoundPayoutLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Pool this round</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-amber-600">{bestBidLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Highest bid discount</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-900">{recipientLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Recipient</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-900">{payoutStatusLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Payout status</p>
        </div>
      </div>
    </article>
  );
}

export const buildBestBidLabel = ({
  bestBidder,
  bestDiscountLabel,
}: {
  bestBidder: string | null;
  bestDiscountLabel: string;
}) => {
  if (!bestBidder || bestBidder === '0x0000000000000000000000000000000000000000') {
    return 'No bid yet';
  }
  return `${bestDiscountLabel} by ${formatAddress(bestBidder)}`;
};

export const buildRecipientLabel = (recipient: string | null) => {
  if (!recipient || recipient === '0x0000000000000000000000000000000000000000') {
    return 'Not selected';
  }
  return formatAddress(recipient);
};

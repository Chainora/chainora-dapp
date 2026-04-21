import { Glyph } from '../../../components/group-detail/Glyph';
import type { GroupActionAvailability } from '../../../services/groupLifecycle';

type CoreRoundActionsCardProps = {
  isViewerMember: boolean;
  isActing: boolean;
  lifecycleLabel: string;
  actionAvailability: GroupActionAvailability;
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  onContribute: () => void;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
  onFinalizePeriod: () => void;
  onClaimPayout: () => void;
  onClaimYield: () => void;
  onRequestJoin: () => void;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
};

const actionPrimaryClass =
  'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const actionSecondaryClass =
  'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export function CoreRoundActionsCard({
  isViewerMember,
  isActing,
  lifecycleLabel,
  actionAvailability,
  bidDiscountInput,
  onBidDiscountChange,
  onContribute,
  onSubmitBid,
  onCloseAuction,
  onFinalizePeriod,
  onClaimPayout,
  onClaimYield,
  onRequestJoin,
  canRequestJoin,
  requestJoinDisabledReason,
}: CoreRoundActionsCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Glyph name="coin" className="h-4 w-4" />
        </span>
        {isViewerMember ? 'Core round actions' : 'Join this group'}
      </h2>
      {isViewerMember ? (
        <>
          <p className="mt-1 text-sm text-slate-500">Contribute, place bid, close auction, and settle period.</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Current phase: {lifecycleLabel}. Only eligible actions for this phase are enabled.
          </p>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={isActing || !actionAvailability.canContribute}
              onClick={onContribute}
              className={`w-full ${actionPrimaryClass}`}
            >
              Contribute
            </button>

            <div className="flex gap-2">
              <input
                value={bidDiscountInput}
                onChange={event => onBidDiscountChange(event.target.value)}
                placeholder="Bid discount (tcUSD)"
                disabled={isActing || !actionAvailability.canSubmitBid}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={isActing || !actionAvailability.canSubmitBid}
                onClick={onSubmitBid}
                className={actionSecondaryClass}
              >
                Submit bid
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isActing || !actionAvailability.canCloseAuction}
                onClick={onCloseAuction}
                className={actionSecondaryClass}
              >
                Close auction
              </button>
              <button
                type="button"
                disabled={isActing || !actionAvailability.canFinalizePeriod}
                onClick={onFinalizePeriod}
                className={actionSecondaryClass}
              >
                Finalize period
              </button>
              <button
                type="button"
                disabled={isActing || !actionAvailability.canClaimPayout}
                onClick={onClaimPayout}
                className={actionSecondaryClass}
              >
                Claim payout
              </button>
              <button
                type="button"
                disabled={isActing || !actionAvailability.canClaimYield}
                onClick={onClaimYield}
                className={actionSecondaryClass}
              >
                Claim yield
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Non-members can only submit a join request. All other actions are member-only.
          </p>
          <button
            type="button"
            disabled={isActing || !canRequestJoin}
            onClick={onRequestJoin}
            title={requestJoinDisabledReason || undefined}
            className={`w-full ${actionPrimaryClass}`}
          >
            Request to join
          </button>
          {requestJoinDisabledReason ? (
            <p className="text-xs text-slate-500">{requestJoinDisabledReason}</p>
          ) : null}
        </div>
      )}
    </article>
  );
}

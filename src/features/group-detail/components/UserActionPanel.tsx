import { Glyph } from '../../../components/group-detail/Glyph';
import type { UserActionAvailability } from '../../../services/groupStatus';
import { BiddingSection } from './BiddingSection';
import { FundingSection } from './FundingSection';
import { PayoutSection } from './PayoutSection';

type UserActionPanelProps = {
  isViewerMember: boolean;
  isActing: boolean;
  groupStatusLabel: string;
  availability: UserActionAvailability;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
  bidDiscountInput: string;
  onBidDiscountChange: (value: string) => void;
  onContribute: () => void;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
  onFinalizePeriod: () => void;
  onClaimPayout: () => void;
  onClaimYield: () => void;
  onRequestJoin: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
};

const actionPrimaryClass =
  'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export function UserActionPanel({
  isViewerMember,
  isActing,
  groupStatusLabel,
  availability,
  canRequestJoin,
  requestJoinDisabledReason,
  bidDiscountInput,
  onBidDiscountChange,
  onContribute,
  onSubmitBid,
  onCloseAuction,
  onFinalizePeriod,
  onClaimPayout,
  onClaimYield,
  onRequestJoin,
  onVoteContinue,
  onVoteEnd,
}: UserActionPanelProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Glyph name="coin" className="h-4 w-4" />
        </span>
        User Actions
      </h2>
      <p className="mt-1 text-xs font-medium text-slate-500">Current phase: {groupStatusLabel}</p>

      {!isViewerMember ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Non-members can only request membership while the group is forming.
          </p>
          <button
            type="button"
            disabled={isActing || !canRequestJoin}
            onClick={onRequestJoin}
            title={requestJoinDisabledReason || undefined}
            className={`w-full ${actionPrimaryClass}`}
          >
            Request to Join
          </button>
          {requestJoinDisabledReason ? (
            <p className="text-xs text-slate-500">{requestJoinDisabledReason}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <FundingSection
            enabled={availability.canContribute}
            isActing={isActing}
            onContribute={onContribute}
          />
          <BiddingSection
            enabled={availability.canSubmitBid || availability.canCloseAuction}
            isActing={isActing}
            bidDiscountInput={bidDiscountInput}
            onBidDiscountChange={onBidDiscountChange}
            onSubmitBid={onSubmitBid}
            onCloseAuction={onCloseAuction}
          />
          <PayoutSection
            enabled={availability.canClaimPayout || availability.canFinalizePeriod}
            canClaimYield={availability.canClaimYield}
            canVoteExtend={availability.canVoteExtendContinue || availability.canVoteExtendEnd}
            isActing={isActing}
            onClaimPayout={onClaimPayout}
            onFinalizePeriod={onFinalizePeriod}
            onClaimYield={onClaimYield}
            onVoteContinue={onVoteContinue}
            onVoteEnd={onVoteEnd}
          />
        </div>
      )}
    </article>
  );
}

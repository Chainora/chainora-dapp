import type { GroupPhase } from '../../../services/groupsService';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';

const buttonClassName =
  'rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export function UserActionCard({
  selectedPhase,
  groupStatus,
  permissions,
  isViewerMember,
  canRequestJoin,
  requestJoinDisabledReason,
  isActing,
  onRequestJoin,
  onContribute,
  onSubmitBid,
  onCloseAuction,
  onClaim,
  onFinalize,
  onVoteContinue,
  onVoteEnd,
  onClaimYield,
}: {
  selectedPhase: GroupPhase;
  groupStatus: string;
  permissions: PhasePermissionViewModel;
  isViewerMember: boolean;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
  isActing: boolean;
  onRequestJoin: () => void;
  onContribute: () => void;
  onSubmitBid: () => void;
  onCloseAuction: () => void;
  onClaim: () => void;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onClaimYield: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">User Actions</h3>
      <p className="mt-1 text-xs text-slate-500">Status: {groupStatus}</p>

      {!isViewerMember ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            disabled={!canRequestJoin || isActing}
            onClick={onRequestJoin}
            title={!canRequestJoin ? requestJoinDisabledReason : undefined}
            className={`w-full ${buttonClassName}`}
          >
            Request to Join
          </button>
          {!canRequestJoin ? <p className="text-xs text-slate-500">{requestJoinDisabledReason}</p> : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {selectedPhase === 'funding' ? (
            <button
              type="button"
              disabled={!permissions.canContribute || isActing}
              onClick={onContribute}
              title={!permissions.canContribute ? permissions.disabledReason : undefined}
              className={`w-full ${buttonClassName}`}
            >
              Contribute
            </button>
          ) : null}

          {selectedPhase === 'bidding' ? (
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={!permissions.canBid || isActing}
                onClick={onSubmitBid}
                title={!permissions.canBid ? permissions.disabledReason : undefined}
                className={buttonClassName}
              >
                Submit Bid
              </button>
              <button
                type="button"
                disabled={!permissions.canCloseAuction || isActing}
                onClick={onCloseAuction}
                title={!permissions.canCloseAuction ? permissions.disabledReason : undefined}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close Auction
              </button>
            </div>
          ) : null}

          {selectedPhase === 'payout' ? (
            <button
              type="button"
              disabled={!permissions.canClaim || isActing}
              onClick={onClaim}
              title={!permissions.canClaim ? permissions.disabledReason : undefined}
              className={`w-full ${buttonClassName}`}
            >
              Claim Payout
            </button>
          ) : null}

          {selectedPhase === 'ending' ? (
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={!permissions.canFinalize || isActing}
                onClick={onFinalize}
                title={!permissions.canFinalize ? permissions.disabledReason : undefined}
                className={buttonClassName}
              >
                Finalize Period
              </button>
              <button
                type="button"
                disabled={!permissions.canVoteContinue || isActing}
                onClick={onVoteContinue}
                title={!permissions.canVoteContinue ? permissions.disabledReason : undefined}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vote Continue
              </button>
              <button
                type="button"
                disabled={!permissions.canVoteEnd || isActing}
                onClick={onVoteEnd}
                title={!permissions.canVoteEnd ? permissions.disabledReason : undefined}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vote End
              </button>
              <button
                type="button"
                disabled={!permissions.canClaimYield || isActing}
                onClick={onClaimYield}
                title={!permissions.canClaimYield ? permissions.disabledReason : undefined}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Claim Yield
              </button>
            </div>
          ) : null}

          {selectedPhase !== 'ending' ? (
            <button
              type="button"
              disabled={!permissions.canClaimYield || isActing}
              onClick={onClaimYield}
              title={!permissions.canClaimYield ? permissions.disabledReason : undefined}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Claim Yield
            </button>
          ) : null}

          {permissions.disabledReason ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {permissions.disabledReason}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

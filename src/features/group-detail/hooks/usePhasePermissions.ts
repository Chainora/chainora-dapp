import { useMemo } from 'react';

import type {
  ApiGroup,
  ApiGroupViewRuntimeMeta,
  ApiGroupViewPermissions,
  ApiGroupViewSelection,
} from '../../../services/groupsService';
import { deriveLifecycleStatus } from '../model';

type UsePhasePermissionsParams = {
  group: ApiGroup | undefined;
  permissions: ApiGroupViewPermissions | undefined;
  selection: ApiGroupViewSelection | undefined;
  runtime: ApiGroupViewRuntimeMeta | undefined;
  isViewerMember: boolean;
};

export type PhasePermissionViewModel = {
  isCurrentActivePhase: boolean;
  isHistoricalView: boolean;
  isFutureView: boolean;
  isReadOnlySelection: boolean;
  canRequestJoin: boolean;
  canContribute: boolean;
  canBid: boolean;
  canCloseAuction: boolean;
  canClaim: boolean;
  canFinalize: boolean;
  canVoteContinue: boolean;
  canVoteEnd: boolean;
  canClaimYield: boolean;
  disabledReason: string;
};

export const usePhasePermissions = ({
  group,
  permissions,
  selection,
  runtime,
  isViewerMember,
}: UsePhasePermissionsParams): PhasePermissionViewModel => {
  return useMemo(() => {
    const groupStatus = deriveLifecycleStatus(group);
    const isCurrentActivePhase = Boolean(selection?.isCurrentActivePhase);
    const isHistoricalView = Boolean(selection?.isHistoricalView);
    const isFutureView = Boolean(selection?.isFutureView);
    const isReadOnlySelection = isHistoricalView || isFutureView || !isCurrentActivePhase;

    const canContribute = Boolean(permissions?.canContribute && isCurrentActivePhase);
    const nowUnix = Math.floor(Date.now() / 1000);
    const runtimeCollectingSyncToPayout = Boolean(
      runtime
      && runtime.storedPeriodStatus === 0
      && runtime.allActiveContributed
      && runtime.contributionDeadline > 0
      && nowUnix >= runtime.contributionDeadline
      && !runtime.auctionReady,
    );
    const runtimeAuctionSyncToPayout = Boolean(
      runtime
      && runtime.storedPeriodStatus === 1
      && runtime.auctionDeadline > 0
      && nowUnix >= runtime.auctionDeadline,
    );
    const shouldForceSyncRuntime = isCurrentActivePhase
      && (runtimeCollectingSyncToPayout || runtimeAuctionSyncToPayout);

    const canBid = shouldForceSyncRuntime
      ? false
      : Boolean(permissions?.canBid && isCurrentActivePhase);
    const canClaim = Boolean(permissions?.canClaim && isCurrentActivePhase);
    const canFinalize = Boolean(permissions?.canFinalize && isCurrentActivePhase);
    const canVoteContinue = Boolean(permissions?.canVoteExtend && isCurrentActivePhase);
    const canVoteEnd = Boolean(permissions?.canVoteExtend && isCurrentActivePhase);
    const canClaimYield = Boolean(permissions?.canClaimYield);

    const canCloseAuction = shouldForceSyncRuntime
      ? true
      : Boolean(permissions?.canCloseAuction && isCurrentActivePhase);

    const canRequestJoin = Boolean(
      groupStatus === 'forming' &&
      group?.publicRecruitment &&
      !isViewerMember,
    );

    let disabledReason = permissions?.disabledReason?.trim() ?? '';

    if (!disabledReason && isHistoricalView) {
      disabledReason = 'Historical phase is read-only.';
    }
    if (!disabledReason && isFutureView) {
      disabledReason = 'Upcoming phase is not actionable yet.';
    }
    if (!disabledReason && !isViewerMember) {
      disabledReason = 'You must be a member to perform this action.';
    }
    if (!canRequestJoin && !isViewerMember) {
      if (!group?.publicRecruitment) {
        disabledReason = 'This is a private group. You need an invite from members.';
      } else if (groupStatus !== 'forming') {
        disabledReason = 'Join requests are available only while the group is forming.';
      }
    }

    return {
      isCurrentActivePhase,
      isHistoricalView,
      isFutureView,
      isReadOnlySelection,
      canRequestJoin,
      canContribute,
      canBid,
      canCloseAuction,
      canClaim,
      canFinalize,
      canVoteContinue,
      canVoteEnd,
      canClaimYield,
      disabledReason,
    };
  }, [
    group,
    isViewerMember,
    runtime?.allActiveContributed,
    runtime?.auctionDeadline,
    runtime?.auctionReady,
    runtime?.contributionDeadline,
    runtime?.storedPeriodStatus,
    permissions?.canBid,
    permissions?.canClaim,
    permissions?.canCloseAuction,
    permissions?.canClaimYield,
    permissions?.canContribute,
    permissions?.canFinalize,
    permissions?.canVoteExtend,
    permissions?.disabledReason,
    selection?.isCurrentActivePhase,
    selection?.isFutureView,
    selection?.isHistoricalView,
    selection?.phase,
  ]);
};

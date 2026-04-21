import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from '@tanstack/react-router';

import { DetailSkeleton } from '../features/group-detail/components/DetailSkeleton';
import { DetailTopBar } from '../features/group-detail/components/DetailTopBar';
import { GroupDetailsHeader } from '../features/group-detail/components/GroupDetailsHeader';
import { PhasePrimaryPanel } from '../features/group-detail/components/PhasePrimaryPanel';
import { PhaseSupportRail } from '../features/group-detail/components/PhaseSupportRail';
import { PoolActionQrDialog } from '../features/group-detail/components/PoolActionQrDialog';
import { PoolTimeline } from '../features/group-detail/components/PoolTimeline';
import { ToastStack } from '../features/group-detail/components/ToastStack';
import { compactUiConfig, resolveCompactUiPhase } from '../features/group-detail/compactConfig';
import { useGroupDetail } from '../features/group-detail/hooks/useGroupDetail';

type GroupDetailProps = {
  poolId: string;
};

const desktopMinWidth = 1024;

export function GroupDetailPage({ poolId }: GroupDetailProps) {
  const navigate = useNavigate();
  const detail = useGroupDetail({ poolId });
  const [isCompactViewport, setIsCompactViewport] = useState(true);

  useEffect(() => {
    const updateViewportMode = () => {
      const isDesktop = window.innerWidth >= desktopMinWidth;
      const hasEnoughHeight = window.innerHeight >= compactUiConfig.viewportHeightThreshold;
      setIsCompactViewport(isDesktop && hasEnoughHeight);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  const statusMessage = useMemo(() => {
    if (detail.inputError) {
      return { tone: 'error' as const, value: detail.inputError };
    }
    if (detail.poolAction.actionError) {
      return { tone: 'error' as const, value: detail.poolAction.actionError };
    }
    if (detail.error) {
      return { tone: 'error' as const, value: detail.error };
    }
    if (detail.poolAction.actionMessage) {
      return { tone: 'info' as const, value: detail.poolAction.actionMessage };
    }
    return null;
  }, [detail.error, detail.inputError, detail.poolAction.actionError, detail.poolAction.actionMessage]);

  if (!detail.isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (detail.isLoading && !detail.group) {
    return <DetailSkeleton />;
  }

  if (!detail.group) {
    return (
      <section className="mx-auto max-w-5xl p-4">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {detail.error || 'Group not found'}
        </p>
      </section>
    );
  }

  const uiPhase = resolveCompactUiPhase(detail.groupStatus, detail.activePhase);
  const phaseStatus = detail.phaseMeta?.phaseStatus ?? 'ended';
  const countdownSeconds = detail.phaseMeta?.countdownSeconds ?? 0;
  const countdownLabel = detail.phaseMeta?.countdownLabel ?? 'N/A';

  return (
    <section
      className={`relative mx-auto max-w-6xl -mt-4 ${isCompactViewport ? 'h-[calc(100svh-10.5rem)] overflow-y-auto' : 'space-y-4 pb-6'}`}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 bg-[radial-gradient(80%_100%_at_15%_0%,rgba(186,230,253,0.62)_0%,rgba(255,255,255,0)_70%),radial-gradient(60%_85%_at_100%_5%,rgba(254,243,199,0.58)_0%,rgba(255,255,255,0)_70%)]" />

      <div className={isCompactViewport ? 'grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2.5' : 'flex flex-col gap-2.5'}>
        <DetailTopBar
          isRefreshing={detail.isRefreshing}
          onBack={() => {
            void navigate({ to: '/dashboard' });
          }}
          onRefresh={detail.onRefresh}
        />

        <GroupDetailsHeader
          group={detail.group}
          groupStatus={detail.groupStatus}
          activePeriod={detail.activePeriod}
          activePhase={detail.activePhase}
          membersLabel={detail.membersLabel}
          contributionLabel={detail.contributionLabel}
          totalPayoutLabel={detail.totalPayoutLabel}
          periodMeta={detail.periodMeta}
          phaseStatus={phaseStatus}
          countdownSeconds={countdownSeconds}
          countdownLabel={countdownLabel}
        />

        <div className={isCompactViewport ? 'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2.5' : 'grid gap-2.5'}>
          <PoolTimeline activePhase={uiPhase} groupStatus={detail.groupStatus} activePeriod={detail.activePeriod} />

          <div className={`grid gap-2.5 ${isCompactViewport ? 'min-h-0 h-full lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
            <div className={isCompactViewport ? 'min-h-0 h-full' : ''}>
              <PhasePrimaryPanel
                uiPhase={uiPhase}
                groupStatus={detail.groupStatus}
                periodMeta={detail.periodMeta}
                memberStates={detail.memberStates}
                permissions={detail.permissions}
                isViewerMember={detail.isViewerMember}
                isConnected={detail.isConnected}
                isActing={detail.poolAction.isActing}
                canProposeInvite={detail.canProposeInvite}
                canLeaveDuringForming={detail.canLeaveDuringForming}
                candidateAddress={detail.candidateAddress}
                canConfirmJoin={detail.canConfirmJoin}
                confirmJoinLabel={detail.confirmJoinLabel}
                canRequestJoin={detail.canRequestJoin}
                requestJoinDisabledReason={detail.requestJoinDisabledReason}
                contributionLabel={detail.contributionLabel}
                bidDiscountInput={detail.bidDiscountInput}
                onBidDiscountChange={detail.setBidDiscountInput}
                onCandidateAddressChange={detail.setCandidateAddress}
                onProposeInvite={detail.onProposeInvite}
                onLeaveDuringForming={detail.onLeaveDuringForming}
                onRequestJoin={detail.onRequestJoin}
                onConfirmJoin={detail.onConfirmJoin}
                onContribute={detail.onContribute}
                onSubmitBid={detail.onSubmitBid}
                onCloseAuction={detail.onCloseAuction}
                onClaim={detail.onClaimPayout}
                onFinalize={detail.onFinalizePeriod}
                onVoteContinue={detail.onVoteContinue}
                onVoteEnd={detail.onVoteEnd}
              />
            </div>

            <div className={isCompactViewport ? 'min-h-0 h-full' : ''}>
              <PhaseSupportRail
                uiPhase={uiPhase}
                members={detail.memberPhaseViews}
                proposals={detail.inviteProposals}
                isMember={detail.isViewerMember}
                isConnected={detail.isConnected}
                isActing={detail.poolAction.isActing}
                viewerAddress={detail.viewerAddress}
                onVoteProposal={detail.onVoteProposal}
              />
            </div>
          </div>

          
        </div>
{/* <GroupHistoryTable rows={detail.historyRows} /> */}
        {statusMessage ? (
          <p
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              statusMessage.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'
            }`}
          >
            {statusMessage.value}
          </p>
        ) : (
          <div className="h-0" />
        )}
      </div>

      <PoolActionQrDialog
        isOpen={detail.poolAction.isOpen}
        actionLabel={detail.poolAction.pendingActionLabel}
        isPreparing={detail.poolAction.isPreparing}
        status={detail.poolAction.status}
        statusMessage={detail.poolAction.statusMessage}
        qrImageUrl={detail.poolAction.qrImageUrl}
        qrLocked={detail.poolAction.qrLocked}
        isSuccess={detail.poolAction.isSuccess}
        errorMessage={detail.poolAction.errorMessage}
        onClose={detail.poolAction.closeDialog}
        onRefresh={detail.poolAction.refreshQr}
      />
      <ToastStack toasts={detail.toasts} onDismiss={detail.dismissToast} />
    </section>
  );
}

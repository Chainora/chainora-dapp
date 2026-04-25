import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from '@tanstack/react-router';

import { DetailSkeleton } from '../features/group-detail/components/DetailSkeleton';
import { DetailTopBar } from '../features/group-detail/components/DetailTopBar';
import { GroupDetailsHeader } from '../features/group-detail/components/GroupDetailsHeader';
import { GroupHistoryTable } from '../features/group-detail/components/GroupHistoryTable';
import { PhasePrimaryPanel } from '../features/group-detail/components/PhasePrimaryPanel';
import { PhaseSupportRail } from '../features/group-detail/components/PhaseSupportRail';
import { PoolActionWalletDialog } from '../features/group-detail/components/PoolActionWalletDialog';
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
    if (detail.phaseHintMessage) {
      return { tone: 'info' as const, value: detail.phaseHintMessage };
    }
    return null;
  }, [
    detail.error,
    detail.inputError,
    detail.phaseHintMessage,
    detail.poolAction.actionError,
    detail.poolAction.actionMessage,
  ]);

  if (!detail.isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (detail.isLoading && !detail.group) {
    return <DetailSkeleton />;
  }

  if (!detail.group) {
    return (
      <section className="mx-auto w-full max-w-[1280px] px-6 py-6">
        <p
          className="t-small px-4 py-3"
          style={{
            background: 'var(--risk-bg)',
            color: 'var(--risk-300)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 'var(--r-md)',
          }}
        >
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
    <>
      <section
        className={`aurora relative mx-auto w-full max-w-[1280px] px-6 ${
          isCompactViewport ? 'h-[calc(100svh-10.5rem)] overflow-y-auto pt-4' : 'space-y-4 py-6'
        }`}
      >
        <div className={isCompactViewport ? 'relative z-10 grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2.5' : 'relative z-10 flex flex-col gap-2.5'}>
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

          {statusMessage ? (
            <p
              className="t-tiny font-semibold px-3 py-2"
              style={{
                background:
                  statusMessage.tone === 'error' ? 'var(--risk-bg)' : 'rgba(40,151,255,0.12)',
                color:
                  statusMessage.tone === 'error' ? 'var(--risk-300)' : 'var(--signal-300)',
                border:
                  statusMessage.tone === 'error'
                    ? '1px solid rgba(239,68,68,0.4)'
                    : '1px solid rgba(40,151,255,0.4)',
                borderRadius: 'var(--r-md)',
              }}
            >
              {statusMessage.value}
            </p>
          ) : (
            <div className="h-0" />
          )}
        </div>
      </section>

      <section className="mx-auto mt-2 w-full max-w-[1280px] px-6 pb-6">
        <div className="relative z-10">
          <GroupHistoryTable rows={detail.historyRows} />
        </div>
      </section>

      <PoolActionWalletDialog
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
    </>
  );
}

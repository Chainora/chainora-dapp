import { useMemo } from 'react';
import { Navigate, useNavigate } from '@tanstack/react-router';

import { BidLeaderboard } from '../features/group-detail/components/BidLeaderboard';
import { DetailSkeleton } from '../features/group-detail/components/DetailSkeleton';
import { GroupDetailBreadcrumb } from '../features/group-detail/components/GroupDetailBreadcrumb';
import { GroupHeroBlock } from '../features/group-detail/components/GroupHeroBlock';
import { MembersTable } from '../features/group-detail/components/MembersTable';
import { PhasePrimaryPanel } from '../features/group-detail/components/PhasePrimaryPanel';
import { PoolActionWalletDialog } from '../features/group-detail/components/PoolActionWalletDialog';
import { ScheduleGrid } from '../features/group-detail/components/ScheduleGrid';
import { ToastStack } from '../features/group-detail/components/ToastStack';
import { resolveCompactUiPhase } from '../features/group-detail/compactConfig';
import { useGroupDetail } from '../features/group-detail/hooks/useGroupDetail';
import { formatToken } from '../features/group-detail/utils';

type GroupDetailProps = {
  poolId: string;
};

const CHAIN_NAME =
  (import.meta.env.VITE_CHAINORA_NETWORK_NAME as string | undefined)?.trim() || 'Chainora Rollup';

export function GroupDetailPage({ poolId }: GroupDetailProps) {
  const navigate = useNavigate();
  const detail = useGroupDetail({ poolId });

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

  const heroDeadlineEpoch = (() => {
    const meta = detail.periodMeta;
    if (!meta) return null;
    switch (uiPhase) {
      case 'funding':
        return meta.contributionDeadline || null;
      case 'bidding':
        return meta.auctionDeadline || null;
      case 'payout':
        return meta.periodEndAt || null;
      default:
        return null;
    }
  })();

  const paidCount = detail.memberStates.filter(member => member.state === 'paid').length;
  const totalMembers = Math.max(detail.memberStates.length, 1);
  const paidThisPeriodLabel = `${paidCount} / ${totalMembers}`;
  const paidIsComplete = paidCount > 0 && paidCount >= totalMembers;

  const bestDiscountRaw = detail.periodMeta?.bestDiscount ?? '0';
  let bestDiscountLabel = '—';
  try {
    if (BigInt(bestDiscountRaw) > 0n) {
      bestDiscountLabel = formatToken(bestDiscountRaw);
    }
  } catch {
    bestDiscountLabel = '—';
  }

  const bidders = detail.memberPhaseViews.filter(member => {
    if (!member.bidAmountRaw) return false;
    try {
      return BigInt(member.bidAmountRaw) > 0n;
    } catch {
      return false;
    }
  });
  const eligibleCount = detail.memberPhaseViews.filter(member => member.state !== 'archived').length;

  const payoutEstimateLabel = (() => {
    try {
      const totalContributed = BigInt(detail.periodMeta?.totalContributed ?? '0');
      const bestDiscount = BigInt(bestDiscountRaw);
      const estimate = totalContributed > bestDiscount ? totalContributed - bestDiscount : 0n;
      return formatToken(estimate.toString());
    } catch {
      return formatToken('0');
    }
  })();

  const shouldShowLeaderboard = uiPhase === 'bidding' || bidders.length > 0;

  const periodStartAt = detail.periodMeta?.startAt ?? 0;
  const periodDuration = detail.group.periodDuration ?? 0;

  return (
    <>
      <section className="mx-auto w-full max-w-[1280px] px-6 py-6">
        <GroupDetailBreadcrumb
          groupName={detail.group.name}
          currentCycle={detail.currentCycle}
          isRefreshing={detail.isRefreshing}
          onBack={() => {
            void navigate({ to: '/dashboard' });
          }}
          onRefresh={detail.onRefresh}
        />

        <GroupHeroBlock
          group={detail.group}
          groupStatus={detail.groupStatus}
          currentCycle={detail.currentCycle}
          uiPhase={uiPhase}
          membersLabel={detail.membersLabel}
          contributionLabel={detail.contributionLabel}
          totalPayoutLabel={detail.totalPayoutLabel}
          bestDiscountLabel={bestDiscountLabel}
          deadlineEpochSeconds={heroDeadlineEpoch}
          paidThisPeriodLabel={paidThisPeriodLabel}
          paidIsComplete={paidIsComplete}
          chainName={CHAIN_NAME}
        />

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 min-w-0">
            <MembersTable
              members={detail.memberPhaseViews}
              uiPhase={uiPhase}
              proposals={detail.inviteProposals}
              isMember={detail.isViewerMember}
              isConnected={detail.isConnected}
              isActing={detail.poolAction.isActing}
              viewerAddress={detail.viewerAddress}
              onVoteProposal={detail.onVoteProposal}
            />

            {shouldShowLeaderboard ? (
              <BidLeaderboard
                members={detail.memberPhaseViews}
                activePeriod={detail.activePeriod}
                bidderCount={bidders.length}
                eligibleCount={eligibleCount}
                payoutEstimateLabel={payoutEstimateLabel}
                viewerAddress={detail.viewerAddress}
              />
            ) : null}

            <ScheduleGrid
              totalPeriods={detail.totalPeriods}
              activePeriod={detail.activePeriod}
              currentCycle={detail.currentCycle}
              historyRows={detail.historyRows}
              periodStartAt={periodStartAt}
              periodDuration={periodDuration}
            />
          </div>

          <div className="min-w-0">
            <div style={{ position: 'sticky', top: 24 }}>
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
                activePeriod={detail.activePeriod}
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
          </div>
        </div>

        {statusMessage ? (
          <p
            className="t-tiny font-semibold mt-4 px-3 py-2"
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
        ) : null}
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

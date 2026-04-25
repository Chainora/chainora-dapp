import type { ReactNode } from 'react';

import type {
  ApiGroupViewMemberState,
  ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import type { GroupStatus } from '../../../services/groupStatus';
import { Button } from '../../../components/ui/Button';
import { type CompactUiPhase } from '../compactConfig';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';
import { formatToken } from '../utils';

const heroPanelStyle = {
  background: 'linear-gradient(180deg, rgba(40,151,255,0.12), var(--ink-2) 60%)',
  border: '1px solid rgba(40,151,255,0.35)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 22px',
  boxShadow: '0 20px 60px -20px rgba(40,151,255,0.25)',
} as const;

const innerSurfaceStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
  padding: '12px 14px',
} as const;

const labelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: 'var(--signal-300)',
  fontWeight: 600,
};

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: '-0.035em',
  lineHeight: 1.15,
  margin: '8px 0 6px',
  color: 'var(--haze-1)',
} as const;

const accentStyle = {
  color: 'var(--signal-300)',
  fontStyle: 'normal' as const,
  fontWeight: 500,
};

const subTextStyle = {
  fontSize: 12,
  color: 'var(--haze-3)',
  lineHeight: 1.5,
  marginBottom: 16,
} as const;

const inlineLabelStyle = {
  fontSize: 10,
  color: 'var(--haze-4)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  marginBottom: 6,
};

function HeroShell({
  children,
  activePeriod,
  showPeriodSuffix = true,
}: {
  children: ReactNode;
  activePeriod: number;
  showPeriodSuffix?: boolean;
}) {
  return (
    <article style={heroPanelStyle}>
      <div style={labelStyle}>
        Your action{showPeriodSuffix ? ` · period ${activePeriod}` : ''}
      </div>
      {children}
    </article>
  );
}

export function PhasePrimaryPanel({
  uiPhase,
  groupStatus,
  periodMeta,
  memberStates,
  permissions,
  isViewerMember,
  isConnected,
  isActing,
  canProposeInvite,
  canLeaveDuringForming,
  candidateAddress,
  canConfirmJoin,
  confirmJoinLabel,
  canRequestJoin,
  requestJoinDisabledReason,
  contributionLabel,
  bidDiscountInput,
  activePeriod,
  onBidDiscountChange,
  onCandidateAddressChange,
  onProposeInvite,
  onLeaveDuringForming,
  onRequestJoin,
  onContribute,
  onSubmitBid,
  onClaim,
  onFinalize,
  onVoteContinue,
  onVoteEnd,
  onConfirmJoin,
}: {
  uiPhase: CompactUiPhase;
  groupStatus: GroupStatus;
  periodMeta: ApiGroupViewPeriodMeta | undefined;
  memberStates: ApiGroupViewMemberState[];
  permissions: PhasePermissionViewModel;
  isViewerMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  canProposeInvite: boolean;
  canLeaveDuringForming: boolean;
  candidateAddress: string;
  canConfirmJoin: boolean;
  confirmJoinLabel: string;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
  contributionLabel: string;
  bidDiscountInput: string;
  activePeriod: number;
  onBidDiscountChange: (value: string) => void;
  onCandidateAddressChange: (value: string) => void;
  onProposeInvite: (candidateAddress: string) => void;
  onLeaveDuringForming: () => void;
  onRequestJoin: () => void;
  onContribute: () => void;
  onSubmitBid: () => void;
  onClaim: () => void;
  onFinalize: () => void;
  onVoteContinue: () => void;
  onVoteEnd: () => void;
  onConfirmJoin: () => void;
}) {
  const paidCount = memberStates.filter(member => member.state === 'paid').length;
  const totalMembers = memberStates.length;
  const bestDiscount = formatToken(periodMeta?.bestDiscount ?? '0');
  const inviteDisabledReason = !isConnected
    ? 'Connect wallet to invite.'
    : !canProposeInvite
      ? 'Only active members can invite during forming.'
      : candidateAddress.trim() === ''
        ? 'Enter candidate username or wallet.'
        : '';

  if (uiPhase === 'forming') {
    return (
      <HeroShell activePeriod={activePeriod} showPeriodSuffix={false}>
        <h2 style={headingStyle}>
          {isViewerMember ? (
            <>
              Invite candidates &amp; <em style={accentStyle}>vote</em> on requests.
            </>
          ) : (
            <>
              Wait for <em style={accentStyle}>2/3 vote</em>, then confirm join.
            </>
          )}
        </h2>
        <p style={subTextStyle}>
          {isViewerMember
            ? 'Group is collecting members. Invite candidates here and monitor proposals on the support panel.'
            : 'Group is forming. Request to join if recruitment is still open.'}
        </p>

        <div className="space-y-3">
          {isViewerMember ? (
            <>
              <input
                value={candidateAddress}
                onChange={event => onCandidateAddressChange(event.target.value)}
                placeholder="Username / init / 0x wallet"
                className="input w-full"
                style={{ height: 38 }}
              />
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={!isConnected || isActing || !canProposeInvite || candidateAddress.trim() === ''}
                onClick={() => onProposeInvite(candidateAddress)}
                title={inviteDisabledReason || undefined}
                className="w-full"
              >
                {isActing ? 'Preparing...' : 'Sign & invite candidate'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canLeaveDuringForming || isActing}
                onClick={onLeaveDuringForming}
                title={
                  !canLeaveDuringForming
                    ? 'Leave is only available while group is forming.'
                    : 'Leave permanently before contributions begin.'
                }
                className="w-full"
                style={{
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: 'var(--risk-300)',
                  background: 'var(--risk-bg)',
                }}
              >
                {isActing ? 'Preparing...' : 'Leave group'}
              </Button>
            </>
          ) : null}

          {!isViewerMember && canConfirmJoin ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isActing}
              onClick={onConfirmJoin}
              className="w-full"
            >
              {isActing ? 'Preparing...' : confirmJoinLabel}
            </Button>
          ) : null}
          {!isViewerMember && !canConfirmJoin ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!canRequestJoin || isActing}
              onClick={onRequestJoin}
              title={!canRequestJoin ? requestJoinDisabledReason : undefined}
              className="w-full"
            >
              {isActing ? 'Preparing...' : 'Request to join'}
            </Button>
          ) : null}
          {!isViewerMember && !canConfirmJoin && !canRequestJoin ? (
            <p className="t-tiny c-3">{requestJoinDisabledReason}</p>
          ) : null}
        </div>
      </HeroShell>
    );
  }

  if (uiPhase === 'funding') {
    return (
      <HeroShell activePeriod={activePeriod}>
        <h2 style={headingStyle}>
          Pay <em style={accentStyle}>contribution</em> before deadline.
        </h2>
        <p style={subTextStyle}>
          Contribute for this period to keep the pool moving. Bidding opens once the funding window closes.
        </p>

        <div style={{ ...innerSurfaceStyle, marginBottom: 12 }}>
          <div style={inlineLabelStyle}>Contribution amount</div>
          <p
            className="t-mono c-1"
            style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {contributionLabel}
          </p>
          <p className="t-tiny c-3 mt-1">
            Paid members: {paidCount}/{totalMembers}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!permissions.canContribute || isActing}
          onClick={onContribute}
          title={!permissions.canContribute ? permissions.disabledReason : undefined}
          className="w-full"
        >
          {isActing ? 'Preparing...' : 'Sign & contribute'}
        </Button>
        {!permissions.canContribute && permissions.disabledReason ? (
          <p className="t-tiny c-3 mt-2">{permissions.disabledReason}</p>
        ) : null}
      </HeroShell>
    );
  }

  if (uiPhase === 'bidding') {
    const canPrimaryBid = permissions.canBid;

    return (
      <HeroShell activePeriod={activePeriod}>
        <h2 style={headingStyle}>
          Place a <em style={accentStyle}>sealed discount</em> bid.
        </h2>
        <p style={subTextStyle}>
          Your discount is the amount deducted from the payout if you win. No bid means no chance this round.
        </p>

        {canPrimaryBid ? (
          <div style={{ ...innerSurfaceStyle, marginBottom: 12 }}>
            <label htmlFor="compact-bid-discount" style={inlineLabelStyle}>
              Your bid (discount)
            </label>
            <input
              id="compact-bid-discount"
              value={bidDiscountInput}
              onChange={event => onBidDiscountChange(event.target.value)}
              inputMode="numeric"
              placeholder="Enter discount"
              className="input w-full"
              style={{ height: 34, fontFamily: 'var(--font-mono)' }}
            />
            <div className="flex items-center justify-between mt-2" style={{ fontSize: 11 }}>
              <span className="c-3">Best discount now</span>
              <span className="t-mono" style={{ color: 'var(--signal-300)' }}>
                {bestDiscount}
              </span>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!canPrimaryBid || isActing}
          onClick={onSubmitBid}
          title={!canPrimaryBid ? permissions.disabledReason : undefined}
          className="w-full"
        >
          {isActing ? 'Preparing...' : 'Sign & submit bid'}
        </Button>
        {!canPrimaryBid && permissions.disabledReason ? (
          <p className="t-tiny c-3 mt-2">{permissions.disabledReason}</p>
        ) : null}
      </HeroShell>
    );
  }

  if (uiPhase === 'payout') {
    return (
      <HeroShell activePeriod={activePeriod}>
        <h2 style={headingStyle}>
          Confirm <em style={accentStyle}>payout</em> receipt.
        </h2>
        <p style={subTextStyle}>
          Recipient claims payout in this phase. If unclaimed before period end, ending phase auto-finalizes.
        </p>

        <div style={{ ...innerSurfaceStyle, marginBottom: 12 }}>
          <div style={inlineLabelStyle}>Payout amount</div>
          <p
            className="t-mono c-1"
            style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatToken(periodMeta?.payoutAmount ?? '0')}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!permissions.canClaim || isActing}
          onClick={onClaim}
          title={!permissions.canClaim ? permissions.disabledReason : undefined}
          className="w-full"
        >
          {isActing ? 'Preparing...' : 'Sign & claim payout'}
        </Button>
        {!permissions.canClaim && permissions.disabledReason ? (
          <p className="t-tiny c-3 mt-2">{permissions.disabledReason}</p>
        ) : null}
      </HeroShell>
    );
  }

  if (groupStatus === 'voting_extension') {
    return (
      <HeroShell activePeriod={activePeriod}>
        <h2 style={headingStyle}>
          <em style={accentStyle}>Vote</em> to continue or end the cycle.
        </h2>
        <p style={subTextStyle}>
          Choose whether to start a new cycle or archive the group.
        </p>

        <div className="grid gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={!permissions.canVoteContinue || isActing}
            onClick={onVoteContinue}
            title={!permissions.canVoteContinue ? permissions.disabledReason : undefined}
            className="w-full"
            style={{
              borderColor: 'rgba(16,185,129,0.4)',
              color: 'var(--ok-300)',
              background: 'var(--ok-bg)',
            }}
          >
            {isActing ? 'Preparing...' : 'Vote continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={!permissions.canVoteEnd || isActing}
            onClick={onVoteEnd}
            title={!permissions.canVoteEnd ? permissions.disabledReason : undefined}
            className="w-full"
            style={{
              borderColor: 'rgba(245,158,11,0.4)',
              color: 'var(--warn-300)',
              background: 'var(--warn-bg)',
            }}
          >
            {isActing ? 'Preparing...' : 'Vote end'}
          </Button>
          {!permissions.canVoteContinue && !permissions.canVoteEnd && permissions.disabledReason ? (
            <p className="t-tiny c-3">{permissions.disabledReason}</p>
          ) : null}
        </div>
      </HeroShell>
    );
  }

  return (
    <HeroShell activePeriod={activePeriod}>
      <h2 style={headingStyle}>
        <em style={accentStyle}>Sync</em> runtime to open next period.
      </h2>
      <p style={subTextStyle}>
        Any active member can sync runtime after payout deadline. Auto-settles unclaimed payout to recipient, then opens the next period.
      </p>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={!permissions.canFinalize || isActing}
        onClick={onFinalize}
        title={!permissions.canFinalize ? permissions.disabledReason : undefined}
        className="w-full"
      >
        {isActing ? 'Preparing...' : 'Sign & sync runtime'}
      </Button>
      {!permissions.canFinalize && permissions.disabledReason ? (
        <p className="t-tiny c-3 mt-2">{permissions.disabledReason}</p>
      ) : null}
    </HeroShell>
  );
}

import { useEffect, useMemo, useState } from 'react';

import type { InviteProposalView, MembershipVoteMode } from '../../../components/group-detail/types';
import type {
  ApiGroupViewPhaseMeta,
  ApiGroupViewPeriodMeta,
} from '../../../services/groupsService';
import type { GroupStatus } from '../../../services/groupStatus';
import {
  compactPhaseLabel,
  compactUiConfig,
  supportTabLabel,
  type CompactUiPhase,
  type SupportRailTab,
} from '../compactConfig';
import type { PhasePermissionViewModel } from '../hooks/usePhasePermissions';
import type { MemberPhaseView } from './MemberStatePanel';
import { StatusBadge } from './StatusBadge';

type InfoRow = {
  label: string;
  value: string;
};

const OverflowSlider = ({
  value,
  className,
}: {
  value: string;
  className: string;
}) => (
  <div className="max-w-full overflow-x-auto">
    <p className={`min-w-max whitespace-nowrap ${className}`} title={value}>
      {value}
    </p>
  </div>
);

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const positiveButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60';

const warningButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60';

const toneByMemberState = (state: string): 'success' | 'warning' | 'info' | 'muted' => {
  if (['paid', 'best_bidder', 'recipient_claimed', 'completed'].includes(state)) {
    return 'success';
  }
  if (['unpaid', 'recipient_pending', 'pending_finalize'].includes(state)) {
    return 'warning';
  }
  if (['eligible', 'waiting_turn'].includes(state)) {
    return 'info';
  }
  return 'muted';
};

const resolveMemberBadgeLabel = (params: {
  uiPhase: CompactUiPhase;
  memberBadge: string | undefined;
  memberState: string;
}): string | null => {
  const rawLabel = params.memberBadge || params.memberState;
  if (params.uiPhase === 'forming' && rawLabel.trim().toLowerCase() === 'unpaid') {
    return null;
  }
  return rawLabel;
};

const formatTimestamp = (unixSeconds: number | undefined): string => {
  if (!unixSeconds || unixSeconds <= 0) {
    return 'N/A';
  }
  return new Date(unixSeconds * 1000).toLocaleString();
};

const buildInfoRows = (params: {
  uiPhase: CompactUiPhase;
  groupStatus: GroupStatus;
  periodMeta: ApiGroupViewPeriodMeta | undefined;
  phaseMeta: ApiGroupViewPhaseMeta | undefined;
  claimableYieldLabel: string;
}): InfoRow[] => {
  const { uiPhase, groupStatus, periodMeta, phaseMeta, claimableYieldLabel } = params;
  const rows: InfoRow[] = [
    { label: 'Lifecycle', value: compactPhaseLabel(uiPhase) },
    { label: 'Group status', value: groupStatus.replace(/_/g, ' ') },
    { label: 'Phase status', value: phaseMeta?.phaseStatus ?? 'N/A' },
    { label: 'Countdown', value: phaseMeta?.countdownLabel ?? 'N/A' },
  ];

  if (uiPhase === 'funding') {
    rows.push(
      { label: 'Contribution deadline', value: formatTimestamp(periodMeta?.contributionDeadline) },
      { label: 'Total contributed', value: periodMeta?.totalContributed ?? '0' },
    );
  } else if (uiPhase === 'bidding') {
    rows.push(
      { label: 'Auction deadline', value: formatTimestamp(periodMeta?.auctionDeadline) },
      { label: 'Best discount', value: periodMeta?.bestDiscount ?? '0' },
      { label: 'Best bidder', value: periodMeta?.bestBidder || 'Not selected' },
    );
  } else if (uiPhase === 'payout') {
    rows.push(
      { label: 'Recipient', value: periodMeta?.recipient || 'Not selected' },
      { label: 'Payout amount', value: periodMeta?.payoutAmount ?? '0' },
      { label: 'Claimed', value: periodMeta?.payoutClaimed ? 'Yes' : 'No' },
    );
  } else if (uiPhase === 'ending') {
    rows.push(
      { label: 'Period end', value: formatTimestamp(periodMeta?.periodEndAt) },
      { label: 'Total contributed', value: periodMeta?.totalContributed ?? '0' },
    );
  }

  rows.push({ label: 'Claimable yield', value: claimableYieldLabel });
  return rows;
};

export function PhaseSupportRail({
  uiPhase,
  groupStatus,
  members,
  proposals,
  periodMeta,
  phaseMeta,
  permissions,
  claimableYieldLabel,
  isMember,
  isConnected,
  isActing,
  viewerAddress,
  canProposeInvite,
  candidateAddress,
  onCandidateAddressChange,
  onProposeInvite,
  onVoteProposal,
  onAcceptProposal,
  onClaimYield,
  onCloseAuction,
}: {
  uiPhase: CompactUiPhase;
  groupStatus: GroupStatus;
  members: MemberPhaseView[];
  proposals: InviteProposalView[];
  periodMeta: ApiGroupViewPeriodMeta | undefined;
  phaseMeta: ApiGroupViewPhaseMeta | undefined;
  permissions: PhasePermissionViewModel;
  claimableYieldLabel: string;
  isMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  viewerAddress: string | null;
  canProposeInvite: boolean;
  candidateAddress: string;
  onCandidateAddressChange: (value: string) => void;
  onProposeInvite: (candidateAddress: string) => void;
  onVoteProposal: (proposalId: string, voteMode: MembershipVoteMode, support: boolean) => void;
  onAcceptProposal: (proposalId: string, voteMode: MembershipVoteMode) => void;
  onClaimYield: () => void;
  onCloseAuction: () => void;
}) {
  const tabs = useMemo(() => compactUiConfig.panelTabOrderByPhase[uiPhase], [uiPhase]);
  const [activeTab, setActiveTab] = useState<SupportRailTab>(tabs[0]);
  const viewerLower = viewerAddress?.toLowerCase() ?? '';

  useEffect(() => {
    setActiveTab(tabs[0]);
  }, [tabs]);

  const infoRows = useMemo(() => buildInfoRows({
    uiPhase,
    groupStatus,
    periodMeta,
    phaseMeta,
    claimableYieldLabel,
  }), [claimableYieldLabel, groupStatus, periodMeta, phaseMeta, uiPhase]);

  const visibleMembers = members;
  const visibleProposals = proposals;
  const visibleInfoRows = infoRows;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Support Rail</h3>
        <StatusBadge label={supportTabLabel(activeTab, uiPhase)} tone="default" />
      </div>

      <div className="mt-2 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === activeTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/70'
            }`}
          >
            {supportTabLabel(tab, uiPhase)}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {activeTab === 'members' ? (
          <div className="space-y-2">
            {visibleMembers.map(member => {
              const badgeLabel = resolveMemberBadgeLabel({
                uiPhase,
                memberBadge: member.badge,
                memberState: member.state,
              });

              return (
                <div key={member.address} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <OverflowSlider
                      value={`${member.displayLabel}${member.isCurrentUser ? ' (You)' : ''}`}
                      className="text-xs font-semibold text-slate-900"
                    />
                    <OverflowSlider value={member.secondaryLabel} className="text-[11px] text-slate-500" />
                  </div>
                  {badgeLabel ? <StatusBadge label={badgeLabel} tone={toneByMemberState(member.state)} /> : null}
                </div>
              );
            })}
            {visibleMembers.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No member data.</p>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'votes' ? (
          <div className="space-y-2">
            {isMember ? (
              <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <input
                  value={candidateAddress}
                  onChange={event => onCandidateAddressChange(event.target.value)}
                  placeholder="Candidate wallet"
                  className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                />
                <button
                  type="button"
                  disabled={!isConnected || isActing || !canProposeInvite || candidateAddress.trim() === ''}
                  onClick={() => onProposeInvite(candidateAddress)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Invite
                </button>
              </div>
            ) : null}

            {visibleProposals.map(proposal => {
              const canAccept = proposal.open
                && proposal.yesVotes >= proposal.requiredYesVotes
                && Boolean(viewerLower)
                && proposal.candidate.toLowerCase() === viewerLower
                && !isMember;
              const canVoteNow = isMember && proposal.canVote;
              const voteStateLabel = proposal.myVote
                ? `You voted ${proposal.myVote}`
                : canVoteNow
                  ? 'Eligible to vote'
                  : !proposal.open
                    ? 'Voting closed'
                    : !isMember
                      ? 'Read-only'
                      : proposal.snapshotEligible === false
                        ? 'Not in voter set when this proposal opened'
                        : 'Voting unavailable';
              const proposalTypeLabel = proposal.voteMode === 'invite' ? 'Invite' : 'Join request';
              const candidateLabel = proposal.candidateUsername?.trim() || 'Unknown user';

              return (
                <div key={`${proposal.voteMode}-${proposal.proposalId}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <OverflowSlider value={candidateLabel} className="text-xs font-semibold text-slate-900" />
                      <OverflowSlider value={proposal.candidate} className="text-[11px] font-mono text-slate-500" />
                      <p className="text-[11px] text-slate-500">{proposalTypeLabel} #{proposal.proposalId}</p>
                      <p className="text-[11px] text-slate-500">Voter set at open: {proposal.quorumMemberCount}</p>
                    </div>
                    <p className="whitespace-nowrap text-[11px] font-semibold text-slate-600">
                      {proposal.yesVotes}/{proposal.requiredYesVotes} yes
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {canAccept ? (
                      <button
                        type="button"
                        disabled={!isConnected || isActing}
                        onClick={() => onAcceptProposal(proposal.proposalId, proposal.voteMode)}
                        className={positiveButtonClass}
                      >
                        Accept
                      </button>
                    ) : null}

                    {canVoteNow ? (
                      <>
                        <button
                          type="button"
                          disabled={!isConnected || isActing}
                          onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, true)}
                          className={positiveButtonClass}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={!isConnected || isActing}
                          onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, false)}
                          className={warningButtonClass}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {voteStateLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {visibleProposals.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No invites or requests.
              </p>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'info' ? (
          <div className="space-y-2">
            {visibleInfoRows.map(item => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                <div className="mt-0.5">
                  <OverflowSlider value={item.value} className="text-xs font-semibold text-slate-800" />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!permissions.canClaimYield || isActing}
                onClick={onClaimYield}
                title={!permissions.canClaimYield ? permissions.disabledReason : undefined}
                className={secondaryButtonClass}
              >
                Claim Yield
              </button>
              <button
                type="button"
                disabled={!permissions.canCloseAuction || isActing || uiPhase !== 'bidding'}
                onClick={onCloseAuction}
                title={!permissions.canCloseAuction ? permissions.disabledReason : undefined}
                className={secondaryButtonClass}
              >
                Close Auction
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

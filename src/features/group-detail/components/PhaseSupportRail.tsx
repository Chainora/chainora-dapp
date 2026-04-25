import { useEffect, useMemo, useState } from 'react';

import { toInitAddress } from '../../../components/UserDetail';
import type { InviteProposalView, MembershipVoteMode } from '../../../components/group-detail/types';
import { compactUiConfig, supportTabLabel, type CompactUiPhase, type SupportRailTab } from '../compactConfig';
import type { MemberPhaseView } from './MemberStatePanel';
import { StatusBadge } from './StatusBadge';

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

const positiveButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60';

const warningButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60';

const toneByMemberState = (state: string): 'success' | 'warning' | 'info' | 'muted' => {
  if (['paid', 'best_bidder', 'recipient_claimed', 'completed', 'vote_continue'].includes(state)) {
    return 'success';
  }
  if (['unpaid', 'recipient_pending', 'vote_end'].includes(state)) {
    return 'warning';
  }
  if (['eligible', 'waiting_turn', 'vote_pending'].includes(state)) {
    return 'info';
  }
  return 'muted';
};

const avatarInitial = (label: string): string => {
  const normalized = label.trim();
  return normalized ? normalized[0].toUpperCase() : '?';
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

export function PhaseSupportRail({
  uiPhase,
  members,
  proposals,
  isMember,
  isConnected,
  isActing,
  viewerAddress,
  onVoteProposal,
}: {
  uiPhase: CompactUiPhase;
  members: MemberPhaseView[];
  proposals: InviteProposalView[];
  isMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  viewerAddress: string | null;
  onVoteProposal: (proposalId: string, voteMode: MembershipVoteMode, support: boolean) => void;
}) {
  const tabs = useMemo(() => compactUiConfig.panelTabOrderByPhase[uiPhase], [uiPhase]);
  const [activeTab, setActiveTab] = useState<SupportRailTab>(tabs[0]);
  const viewerLower = viewerAddress?.toLowerCase() ?? '';

  useEffect(() => {
    setActiveTab(tabs[0]);
  }, [tabs]);

  const visibleMembers = members;
  const visibleProposals = proposals;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Support Rail</h3>

      {tabs.length > 1 ? (
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
      ) : null}

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
                  <div className="min-w-0 flex items-center gap-2">
                    <div
                      className="group relative shrink-0"
                      title={`Reputation: ${member.reputationScore || '0'} | Joined groups: ${String(member.joinedGroupsCount ?? 0)}`}
                    >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={`${member.displayLabel} avatar`}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                          {avatarInitial(member.displayLabel)}
                        </span>
                      )}
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow-md group-hover:block">
                        Rep {member.reputationScore || '0'} | Joined {String(member.joinedGroupsCount ?? 0)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <OverflowSlider
                        value={`${member.displayLabel}${member.isCurrentUser ? ' (You)' : ''}`}
                        className="text-xs font-semibold text-slate-900"
                      />
                      <OverflowSlider value={member.secondaryLabel} className="text-[11px] text-slate-500" />
                      {uiPhase === 'bidding' ? (
                        <OverflowSlider
                          value={member.bidAmountLabel ? `Bid: ${member.bidAmountLabel}` : 'Bid: no bid yet'}
                          className="text-[11px] text-slate-600"
                        />
                      ) : null}
                    </div>
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
            {visibleProposals.map(proposal => {
              const canAccept = proposal.open
                && proposal.yesVotes >= proposal.requiredYesVotes
                && Boolean(viewerLower)
                && proposal.candidate.toLowerCase() === viewerLower
                && !isMember;
              const canVoteNow = isMember && proposal.canVote && !proposal.myVote;
              const voteStateLabel = proposal.myVote
                ? `You voted ${proposal.myVote}`
                : canAccept
                  ? 'Approved. Confirm in Forming workspace.'
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
              const candidateInitAddress = toInitAddress(proposal.candidate) || proposal.candidate;

              return (
                <div key={`${proposal.voteMode}-${proposal.proposalId}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <OverflowSlider value={candidateLabel} className="text-xs font-semibold text-slate-900" />
                      <OverflowSlider value={candidateInitAddress} className="text-[11px] font-mono text-slate-500" />
                      <p className="text-[11px] text-slate-500">{proposalTypeLabel} #{proposal.proposalId}</p>
                      <p className="text-[11px] text-slate-500">Voter set at open: {proposal.quorumMemberCount}</p>
                    </div>
                    <p className="whitespace-nowrap text-[11px] font-semibold text-slate-600">
                      {proposal.yesVotes}/{proposal.requiredYesVotes} yes
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap justify-end gap-2">
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
      </div>
    </aside>
  );
}

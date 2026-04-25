import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button';
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

const memberRowStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

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
    <aside className="card-raised flex h-full min-h-0 flex-col p-4">
      <h3 className="t-h4 c-1">Support Rail</h3>

      {tabs.length > 1 ? (
        <div
          className="mt-2 inline-flex items-center gap-1 p-1"
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {tabs.map(tab => (
            <Button
              key={tab}
              type="button"
              variant={tab === activeTab ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {supportTabLabel(tab, uiPhase)}
            </Button>
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
                <div
                  key={member.address}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                  style={memberRowStyle}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <div
                      className="group relative shrink-0"
                      title={`Reputation: ${member.reputationScore || '0'} | Joined groups: ${String(member.joinedGroupsCount ?? 0)}`}
                    >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={`${member.displayLabel} avatar`}
                          className="h-9 w-9 rounded-full object-cover"
                          style={{ boxShadow: '0 0 0 1px var(--ink-5)' }}
                        />
                      ) : (
                        <span
                          className="t-tiny inline-flex h-9 w-9 items-center justify-center rounded-full font-semibold"
                          style={{
                            background:
                              'linear-gradient(135deg, var(--signal-400), var(--arc-400))',
                            color: 'var(--ink-0)',
                          }}
                        >
                          {avatarInitial(member.displayLabel)}
                        </span>
                      )}
                      <div
                        className="t-tiny pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap px-2 py-1 group-hover:block"
                        style={{
                          background: 'var(--ink-3)',
                          color: 'var(--haze-1)',
                          borderRadius: 'var(--r-sm)',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        Rep {member.reputationScore || '0'} | Joined {String(member.joinedGroupsCount ?? 0)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <OverflowSlider
                        value={`${member.displayLabel}${member.isCurrentUser ? ' (You)' : ''}`}
                        className="t-tiny c-1 font-semibold"
                      />
                      <OverflowSlider value={member.secondaryLabel} className="t-tiny c-3 t-mono" />
                      {uiPhase === 'bidding' ? (
                        <OverflowSlider
                          value={member.bidAmountLabel ? `Bid: ${member.bidAmountLabel}` : 'Bid: no bid yet'}
                          className="t-tiny c-2"
                        />
                      ) : null}
                    </div>
                  </div>
                  {badgeLabel ? <StatusBadge label={badgeLabel} tone={toneByMemberState(member.state)} /> : null}
                </div>
              );
            })}
            {visibleMembers.length === 0 ? (
              <p className="t-tiny c-3 px-3 py-2" style={memberRowStyle}>No member data.</p>
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
                <div
                  key={`${proposal.voteMode}-${proposal.proposalId}`}
                  className="px-3 py-2"
                  style={memberRowStyle}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <OverflowSlider value={candidateLabel} className="t-tiny c-1 font-semibold" />
                      <OverflowSlider value={candidateInitAddress} className="t-tiny c-3 t-mono" />
                      <p className="t-tiny c-3">{proposalTypeLabel} #{proposal.proposalId}</p>
                      <p className="t-tiny c-3">Voter set at open: {proposal.quorumMemberCount}</p>
                    </div>
                    <p className="t-tiny c-2 t-num whitespace-nowrap font-semibold">
                      {proposal.yesVotes}/{proposal.requiredYesVotes} yes
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {canVoteNow ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!isConnected || isActing}
                          onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, true)}
                          style={{
                            borderColor: 'rgba(16,185,129,0.4)',
                            color: 'var(--ok-300)',
                            background: 'var(--ok-bg)',
                          }}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!isConnected || isActing}
                          onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, false)}
                          style={{
                            borderColor: 'rgba(245,158,11,0.4)',
                            color: 'var(--warn-300)',
                            background: 'var(--warn-bg)',
                          }}
                        >
                          No
                        </Button>
                      </>
                    ) : (
                      <span className="chip">{voteStateLabel}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {visibleProposals.length === 0 ? (
              <p className="t-tiny c-3 px-3 py-2" style={memberRowStyle}>
                No invites or requests.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

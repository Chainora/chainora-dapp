import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { toInitAddress } from '../../../components/UserDetail';
import type { InviteProposalView, MembershipVoteMode } from '../../../components/group-detail/types';
import type { CompactUiPhase } from '../compactConfig';
import type { MemberPhaseView } from './MemberStatePanel';
import { StatusBadge } from './StatusBadge';

type MemberStatusFilter = 'all' | 'paid' | 'unpaid' | 'bidding' | 'won' | 'pending';

type Tab = 'members' | 'votes';

type MembersTableProps = {
  members: MemberPhaseView[];
  uiPhase: CompactUiPhase;
  proposals: InviteProposalView[];
  isMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  viewerAddress: string | null;
  onVoteProposal: (proposalId: string, voteMode: MembershipVoteMode, support: boolean) => void;
};

const PAGE_SIZE = 5;

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
} as const;

const titleStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: '-0.03em',
  margin: 0,
} as const;

const cellStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--ink-5)',
} as const;

const headStyle = {
  textAlign: 'left' as const,
  padding: '10px 14px',
  fontSize: 10,
  color: 'var(--haze-4)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  borderBottom: '1px solid var(--ink-5)',
  fontWeight: 600,
};

const proposalRowStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

const tabSwitchStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-pill)',
  padding: 3,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
} as const;

const toneByMemberState = (state: string): 'success' | 'warning' | 'info' | 'muted' | 'danger' => {
  if (['paid', 'best_bidder', 'recipient_claimed', 'completed', 'vote_continue'].includes(state)) {
    return 'success';
  }
  if (['unpaid', 'recipient_pending', 'pending_finalize', 'vote_end'].includes(state)) {
    return 'warning';
  }
  if (['eligible', 'waiting_turn', 'vote_pending'].includes(state)) {
    return 'info';
  }
  return 'muted';
};

const matchesStatus = (member: MemberPhaseView, filter: MemberStatusFilter): boolean => {
  switch (filter) {
    case 'paid':
      return ['paid', 'best_bidder', 'recipient_claimed'].includes(member.state);
    case 'unpaid':
      return ['unpaid', 'pending_finalize'].includes(member.state);
    case 'bidding':
      return Boolean(member.bidAmountRaw) && member.state !== 'recipient_claimed';
    case 'won':
      return ['recipient_claimed', 'completed'].includes(member.state);
    case 'pending':
      return ['eligible', 'waiting_turn', 'vote_pending'].includes(member.state);
    default:
      return true;
  }
};

const ALL_FILTER_CHIPS: Array<{ key: MemberStatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'bidding', label: 'Bidding' },
  { key: 'won', label: 'Won' },
  { key: 'pending', label: 'Pending' },
];

const FILTER_KEYS_BY_PHASE: Record<CompactUiPhase, MemberStatusFilter[]> = {
  forming: ['all'],
  funding: ['all', 'paid', 'unpaid'],
  bidding: ['all', 'bidding', 'paid'],
  payout: ['all', 'won', 'paid'],
  ending: ['all', 'won', 'pending'],
};

const filterChipsForPhase = (phase: CompactUiPhase) => {
  const allowed = new Set(FILTER_KEYS_BY_PHASE[phase] ?? ['all']);
  return ALL_FILTER_CHIPS.filter(chip => allowed.has(chip.key));
};

const formingBadgeOverride = (state: string, badge: string): string | null => {
  if (state === 'unpaid' || badge.trim().toLowerCase() === 'unpaid') {
    return 'Ready';
  }
  return null;
};

const formingToneOverride = (state: string): 'success' | null => {
  if (state === 'unpaid') {
    return 'success';
  }
  return null;
};

const avatarInitial = (label: string): string => {
  const normalized = label.trim();
  return normalized ? normalized[0].toUpperCase() : '?';
};

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5" />
      <path d="M14 14l-3-3" />
    </svg>
  );
}

export function MembersTable({
  members,
  uiPhase,
  proposals,
  isMember,
  isConnected,
  isActing,
  viewerAddress,
  onVoteProposal,
}: MembersTableProps) {
  const showVotesTab = uiPhase === 'forming';
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [proposalPage, setProposalPage] = useState(1);

  useEffect(() => {
    if (!showVotesTab && activeTab === 'votes') {
      setActiveTab('members');
    }
  }, [activeTab, showVotesTab]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter(member => {
      if (q) {
        const matchesQuery =
          member.displayLabel.toLowerCase().includes(q)
          || member.secondaryLabel.toLowerCase().includes(q)
          || member.address.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return matchesStatus(member, statusFilter);
    });
  }, [members, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageMembers = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const viewerLower = viewerAddress?.toLowerCase() ?? '';
  const visibleFilterChips = filterChipsForPhase(uiPhase);
  const showFilterRow = visibleFilterChips.length > 1;

  const sortedProposals = useMemo(() => {
    const toNumeric = (id: string): number => {
      const parsed = Number.parseInt(id, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return [...proposals].sort((a, b) => toNumeric(b.proposalId) - toNumeric(a.proposalId));
  }, [proposals]);

  const hasPendingActionable = useMemo(() => {
    return sortedProposals.some(proposal => proposal.open && proposal.canVote && !proposal.myVote);
  }, [sortedProposals]);

  const proposalTotalPages = Math.max(1, Math.ceil(sortedProposals.length / PAGE_SIZE));
  const safeProposalPage = Math.min(proposalPage, proposalTotalPages);
  const proposalPageStart = (safeProposalPage - 1) * PAGE_SIZE;
  const proposalPageItems = sortedProposals.slice(proposalPageStart, proposalPageStart + PAGE_SIZE);

  useEffect(() => {
    if (proposalPage > proposalTotalPages) {
      setProposalPage(proposalTotalPages);
    }
  }, [proposalPage, proposalTotalPages]);

  const headerSubLabel = activeTab === 'votes'
    ? `${proposals.length} pending`
    : `${members.length} total · ${filtered.length} match`;

  return (
    <section style={cardStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h3 className="c-1" style={titleStyle}>
            {activeTab === 'votes' ? 'Invites &amp; requests' : 'Members'}
          </h3>
          <p className="t-tiny c-3 mt-1">{headerSubLabel}</p>
        </div>

        {showVotesTab ? (
          <div style={tabSwitchStyle}>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={activeTab === 'members' ? 'chip chip-signal' : 'chip'}
              style={{ height: 26, cursor: 'pointer', borderColor: 'transparent' }}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('votes')}
              className={activeTab === 'votes' ? 'chip chip-signal' : 'chip'}
              style={{ height: 26, cursor: 'pointer', borderColor: 'transparent', position: 'relative' }}
            >
              Invites / Requests
              {hasPendingActionable ? (
                <span
                  aria-label="Pending votes"
                  title="Pending votes require your action"
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--risk-300)',
                    boxShadow: '0 0 0 2px var(--ink-2)',
                  }}
                />
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      {activeTab === 'members' ? (
        <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 c-3"
                aria-hidden="true"
              >
                <SearchIcon />
              </span>
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search name or address"
                className="input"
                style={{ paddingLeft: 36, height: 32, width: 220 }}
              />
            </div>
            {showFilterRow ? (
              <div className="flex flex-wrap gap-1">
                {visibleFilterChips.map(chip => {
                  const isActive = chip.key === statusFilter;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setStatusFilter(chip.key)}
                      className={isActive ? 'chip chip-signal' : 'chip'}
                      style={{ cursor: 'pointer' }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto" style={{ flex: 1 }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={headStyle}>Member</th>
                  <th style={headStyle}>Wallet</th>
                  <th style={headStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ ...cellStyle, color: 'var(--haze-3)' }}>
                      No members match the filter.
                    </td>
                  </tr>
                ) : (
                  pageMembers.map(member => (
                    <tr key={member.address}>
                      <td style={cellStyle}>
                        <div className="flex items-center gap-2">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={`${member.displayLabel} avatar`}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                boxShadow: '0 0 0 1px var(--ink-5)',
                              }}
                            />
                          ) : (
                            <span
                              className="t-tiny inline-flex items-center justify-center font-semibold"
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--signal-400), var(--arc-400))',
                                color: 'var(--ink-0)',
                              }}
                            >
                              {avatarInitial(member.displayLabel)}
                            </span>
                          )}
                          <span className="c-1" style={{ fontWeight: 500 }}>
                            {member.displayLabel}
                            {member.isCurrentUser ? ' (You)' : ''}
                          </span>
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <span className="t-mono c-2" style={{ fontSize: 11 }} title={member.address}>
                          {member.secondaryLabel}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        {(() => {
                          const formingLabel = uiPhase === 'forming'
                            ? formingBadgeOverride(member.state, member.badge ?? '')
                            : null;
                          const formingTone = uiPhase === 'forming'
                            ? formingToneOverride(member.state)
                            : null;
                          const label = formingLabel ?? member.badge ?? member.state ?? '—';
                          const tone = formingTone ?? toneByMemberState(member.state);
                          return <StatusBadge label={label || '—'} tone={tone} />;
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            style={{ borderTop: '1px solid var(--ink-5)' }}
          >
            <span className="t-tiny c-3">
              {filtered.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(value => Math.max(1, value - 1))}
              >
                Prev
              </Button>
              <span className="t-tiny c-2">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
          <div className="space-y-2 px-5 pb-3" style={{ flex: 1 }}>
            {proposals.length === 0 ? (
              <p
                className="t-tiny c-3 px-3 py-3"
                style={proposalRowStyle}
              >
                No invites or requests.
              </p>
            ) : (
              proposalPageItems.map(proposal => {
              const candidateLower = proposal.candidate.toLowerCase();
              const candidateInitAddress = toInitAddress(proposal.candidate) || proposal.candidate;
              const candidateLabel = proposal.candidateUsername?.trim() || 'Unknown user';
              const proposalTypeLabel = proposal.voteMode === 'invite' ? 'Invite' : 'Join request';
              const canAccept = proposal.open
                && proposal.yesVotes >= proposal.requiredYesVotes
                && Boolean(viewerLower)
                && candidateLower === viewerLower
                && !isMember;
              const canVoteNow = isMember && proposal.canVote && !proposal.myVote;
              const voteStateLabel = proposal.myVote
                ? `You voted ${proposal.myVote}`
                : canAccept
                  ? 'Approved. Confirm via the action panel.'
                  : canVoteNow
                    ? 'Eligible to vote'
                    : !proposal.open
                      ? 'Voting closed'
                      : !isMember
                        ? 'Read-only'
                        : proposal.snapshotEligible === false
                          ? 'Not in voter set when this proposal opened'
                          : 'Voting unavailable';

              return (
                <div
                  key={`${proposal.voteMode}-${proposal.proposalId}`}
                  className="px-3 py-2"
                  style={proposalRowStyle}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="t-tiny c-1 font-semibold truncate" title={candidateLabel}>
                        {candidateLabel}
                      </p>
                      <p
                        className="t-mono c-3 truncate"
                        style={{ fontSize: 11 }}
                        title={candidateInitAddress}
                      >
                        {candidateInitAddress}
                      </p>
                      <p className="t-tiny c-3">
                        {proposalTypeLabel} #{proposal.proposalId} · Voter set {proposal.quorumMemberCount}
                      </p>
                    </div>
                    <p
                      className="t-tiny c-2 whitespace-nowrap font-semibold"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
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
              })
            )}
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            style={{ borderTop: '1px solid var(--ink-5)' }}
          >
            <span className="t-tiny c-3">
              {proposals.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${proposalPageStart + 1}–${Math.min(proposalPageStart + PAGE_SIZE, proposals.length)} of ${proposals.length}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={safeProposalPage <= 1}
                onClick={() => setProposalPage(value => Math.max(1, value - 1))}
              >
                Prev
              </Button>
              <span className="t-tiny c-2">
                Page {safeProposalPage} / {proposalTotalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={safeProposalPage >= proposalTotalPages}
                onClick={() => setProposalPage(value => Math.min(proposalTotalPages, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

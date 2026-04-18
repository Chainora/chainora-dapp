import { useMemo, useState } from 'react';

import { Glyph } from './Glyph';
import { formatWalletCompact } from './address';
import type { InviteProposalView, MembershipVoteMode } from './types';

type InviteProposalsPanelProps = {
  isMember: boolean;
  isConnected: boolean;
  isActing: boolean;
  viewerAddress: string | null;
  canProposeInvite: boolean;
  candidateAddress: string;
  setCandidateAddress: (value: string) => void;
  proposals: InviteProposalView[];
  onProposeInvite: (candidateAddress: string) => void;
  onVoteProposal: (proposalId: string, voteMode: MembershipVoteMode, support: boolean) => void;
  onAcceptProposal: (proposalId: string, voteMode: MembershipVoteMode) => void;
};

const ratioLabel = (proposal: InviteProposalView): string => {
  if (proposal.quorumMemberCount <= 0) {
    return `${proposal.yesVotes} yes`;
  }
  return `${proposal.yesVotes}/${proposal.quorumMemberCount} yes (${proposal.approvalRatio}%)`;
};

export function InviteProposalsPanel({
  isMember,
  isConnected,
  isActing,
  viewerAddress,
  canProposeInvite,
  candidateAddress,
  setCandidateAddress,
  proposals,
  onProposeInvite,
  onVoteProposal,
  onAcceptProposal,
}: InviteProposalsPanelProps) {
  const [tab, setTab] = useState<MembershipVoteMode>('invite');
  const viewerLower = viewerAddress?.toLowerCase() ?? '';

  const inviteProposals = useMemo(
    () => proposals.filter(proposal => proposal.voteMode === 'invite'),
    [proposals],
  );
  const joinRequestProposals = useMemo(
    () => proposals.filter(proposal => proposal.voteMode === 'join-request'),
    [proposals],
  );
  const visibleProposals = tab === 'invite' ? inviteProposals : joinRequestProposals;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Glyph name="members" className="h-4 w-4" />
        </span>
        Membership votes
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Track invite proposals and join requests currently being voted into this group.
      </p>

      {isMember ? (
        <>
          <div className="mt-4 flex gap-2">
            <input
              value={candidateAddress}
              onChange={event => setCandidateAddress(event.target.value)}
              placeholder="Candidate wallet address"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              disabled={!isConnected || isActing || !canProposeInvite || candidateAddress.trim() === ''}
              onClick={() => onProposeInvite(candidateAddress)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Invite
            </button>
          </div>
          {!canProposeInvite ? (
            <p className="mt-2 text-xs text-slate-500">Invite is only available while group is forming.</p>
          ) : null}
        </>
      ) : null}

      <div className="mt-4 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab('invite')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            tab === 'invite' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/70'
          }`}
        >
          Invites ({inviteProposals.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('join-request')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            tab === 'join-request' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/70'
          }`}
        >
          Join requests ({joinRequestProposals.length})
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {visibleProposals.map(proposal => (
          <div key={proposal.proposalId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-slate-800" title={proposal.candidate}>
                  {formatWalletCompact(proposal.candidate)}
                </p>
                <p className="text-xs text-slate-500">
                  {proposal.voteMode === 'join-request' ? 'Join request' : 'Invite proposal'} #{proposal.proposalId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700">{ratioLabel(proposal)}</p>
                <p className="text-[11px] text-slate-500">
                  Need {proposal.requiredYesVotes} yes · {proposal.noVotes} no
                </p>
              </div>
            </div>

            {proposal.open ? (
              <div className="mt-2 flex items-center justify-end gap-2">
                {proposal.yesVotes >= proposal.requiredYesVotes
                  && viewerLower
                  && proposal.candidate.toLowerCase() === viewerLower
                  && !isMember ? (
                    <button
                      type="button"
                      disabled={!isConnected || isActing}
                      onClick={() => onAcceptProposal(proposal.proposalId, proposal.voteMode)}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {proposal.voteMode === 'invite' ? 'Accept invite' : 'Accept request'}
                    </button>
                  ) : null}
                {proposal.myVote ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    You voted {proposal.myVote}
                  </span>
                ) : isMember ? (
                  <>
                    <button
                      type="button"
                      disabled={!isConnected || isActing || !proposal.canVote}
                      onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, true)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Vote yes"
                    >
                      <Glyph name="check" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!isConnected || isActing || !proposal.canVote}
                      onClick={() => onVoteProposal(proposal.proposalId, proposal.voteMode, false)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Vote no"
                    >
                      <Glyph name="x" className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  proposal.yesVotes >= proposal.requiredYesVotes
                    && viewerLower
                    && proposal.candidate.toLowerCase() === viewerLower
                    && !isMember
                    ? null
                    : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        Read-only
                      </span>
                    )
                )}
              </div>
            ) : null}

            {proposal.open && proposal.yesVotes >= proposal.requiredYesVotes ? (
              <p className="mt-2 text-right text-[11px] font-medium text-emerald-600">
                Approval threshold reached. Waiting candidate acceptance.
              </p>
            ) : null}

            {proposal.open && isMember && !proposal.myVote && !proposal.canVote ? (
              <p className="mt-2 text-right text-[11px] text-slate-500">
                Only members in the proposal snapshot can vote.
              </p>
            ) : (
              !proposal.open ? <p className="mt-2 text-right text-[11px] font-medium text-slate-500">Closed</p> : null
            )}
          </div>
        ))}
        {visibleProposals.length === 0 ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
            {tab === 'invite' ? 'No invite proposal found.' : 'No join request found.'}
          </p>
        ) : null}
      </div>
    </article>
  );
}

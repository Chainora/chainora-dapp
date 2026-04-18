export type InviteVoteChoice = 'yes' | 'no' | null;
export type MembershipVoteMode = 'invite' | 'join-request';

export type InviteProposalView = {
  voteMode: MembershipVoteMode;
  proposalId: string;
  candidate: string;
  candidateUsername?: string;
  yesVotes: number;
  noVotes: number;
  open: boolean;
  myVote: InviteVoteChoice;
  quorumMemberCount: number;
  requiredYesVotes: number;
  approvalRatio: number;
  snapshotEligible?: boolean;
  canVote: boolean;
};

export type MemberIdentityView = {
  address: string;
  initAddress: string;
  displayLabel: string;
  username: string;
  avatarUrl: string;
  isCurrentUser: boolean;
};

export type OnchainPoolSnapshot = {
  creator: string;
  poolStatus: number;
  publicRecruitment: boolean;
  targetMembers: number;
  minReputation: string;
  activeMemberCount: number;
  currentCycle: string;
  currentPeriod: string;
  cycleCompleted: boolean;
  extendVoteOpen: boolean;
  extendVoteRound: string;
  extendYesVotes: string;
  extendRequiredVotes: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
  members: string[];
  isMember: boolean;
  isActiveMember: boolean;
  claimableYield: string;
};

export type PeriodRoundSnapshot = {
  status: number;
  recipient: string;
  bestBidder: string;
  bestDiscount: string;
  totalContributed: string;
  payoutAmount: string;
  payoutClaimed: boolean;
};

export type PoolDiscoverySnapshot = {
  listed: boolean;
  poolStatus: number;
  activeMemberCount: string;
  targetMembers: number;
  minReputation: string;
};

export type RefreshOptions = {
  forceSync?: boolean;
  includeHeavy?: boolean;
};

export type PoolActionIntent = {
  actionKey: string;
  label: string;
  calldata: `0x${string}`;
  valueWei?: string;
};

export type UiToast = {
  id: number;
  tone: 'success' | 'error' | 'info';
  message: string;
};

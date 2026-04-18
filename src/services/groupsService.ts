import { chainoraApiBase } from '../configs/api';

export type GroupScope = 'all' | 'mine' | 'recruiting';
export type GroupVisibility = 'all' | 'public' | 'private';

export type ApiGroup = {
  poolId: string;
  poolAddress: string;
  creatorAddress: string;
  name: string;
  description: string;
  groupImageUrl: string;
  publicRecruitment: boolean;
  contributionAmount: string;
  targetMembers: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
  status: number;
  currentPeriodStatus?: number;
  phase?: string;
  groupStatus?:
    | 'forming'
    | 'active'
    | 'funding'
    | 'bidding'
    | 'payout'
    | 'ended_period'
    | 'voting_extension'
    | 'archived';
  currentCycle: string;
  currentPeriod: string;
  activeMemberCount: number;
  cycleCompleted: boolean;
  extendVoteOpen?: boolean;
  extendVoteRound?: string;
  extendYesVotes?: string;
  extendRequiredVotes?: number;
  txHash: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupPhase = 'funding' | 'bidding' | 'payout' | 'ending';
export type GroupPhaseStatus = 'active' | 'upcoming' | 'ended';

export type ApiGroupViewSelection = {
  cycle: number;
  period: number;
  phase: GroupPhase;
  activePeriod: number;
  activePhase: GroupPhase;
  isCurrentActivePhase: boolean;
  isHistoricalView: boolean;
  isFutureView: boolean;
};

export type ApiGroupViewPeriodMeta = {
  status: number;
  statusLabel: string;
  startAt: number;
  contributionDeadline: number;
  auctionDeadline: number;
  periodEndAt: number;
  recipient: string;
  bestBidder: string;
  bestDiscount: string;
  totalContributed: string;
  payoutAmount: string;
  payoutClaimed: boolean;
};

export type ApiGroupViewPhaseMeta = {
  phase: GroupPhase;
  phaseStatus: GroupPhaseStatus;
  countdownSeconds: number;
  countdownLabel: string;
};

export type ApiGroupViewMemberState = {
  address: string;
  isCurrentUser: boolean;
  isActiveMember: boolean;
  state: string;
  badge: string;
};

export type ApiGroupViewPermissions = {
  canContribute: boolean;
  canBid: boolean;
  canCloseAuction: boolean;
  canClaim: boolean;
  canFinalize: boolean;
  canVoteExtend: boolean;
  canClaimYield: boolean;
  disabledReason: string;
};

export type ApiGroupViewUserClaimState = {
  claimableYield: string;
  claimableArchiveRefund: string;
};

export type ApiGroupDetailView = {
  group: ApiGroup;
  selection: ApiGroupViewSelection;
  periodMeta: ApiGroupViewPeriodMeta;
  phaseMeta: ApiGroupViewPhaseMeta;
  memberStates: ApiGroupViewMemberState[];
  permissions: ApiGroupViewPermissions;
  userClaimState: ApiGroupViewUserClaimState;
};

type Envelope<T> = T | { success?: boolean; data?: T };

export type CreateGroupPayload = {
  poolId: string;
  poolAddress: string;
  name: string;
  description: string;
  groupImageUrl?: string;
  publicRecruitment?: boolean;
  contributionAmount: string;
  targetMembers: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
  txHash: string;
};

const normalizeEnvelope = <T>(raw: Envelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }

  return raw as T;
};

const normalizePublicRecruitment = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return false;
};

const normalizeGroupRecord = (value: unknown): ApiGroup => {
  const group = value as Record<string, unknown>;
  const rawVisibility = group.publicRecruitment ?? group.public_recruitment;
  return {
    ...(group as ApiGroup),
    publicRecruitment: normalizePublicRecruitment(rawVisibility),
  };
};

const withAccessToken = (accessToken: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

export const fetchGroups = async (
  accessToken: string,
  scope: GroupScope,
  q = '',
  options?: {
    sync?: boolean;
    visibility?: GroupVisibility;
  },
): Promise<ApiGroup[]> => {
  const params = new URLSearchParams();
  params.set('scope', scope);
  if (q.trim() !== '') {
    params.set('q', q.trim());
  }
  if (options?.sync) {
    params.set('sync', 'true');
  }
  if (options?.visibility && options.visibility !== 'all') {
    params.set('visibility', options.visibility);
  }

  const response = await fetch(
    `${chainoraApiBase}/v1/groups?${params.toString()}`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load groups failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<ApiGroup[]>;
  const normalized = normalizeEnvelope(raw);
  if (!Array.isArray(normalized)) {
    return [];
  }

  return normalized.map(normalizeGroupRecord);
};

export const fetchGroupByPoolId = async (
  accessToken: string,
  poolId: string,
  options?: {
    sync?: boolean;
  },
): Promise<ApiGroup> => {
  const params = new URLSearchParams();
  if (options?.sync) {
    params.set('sync', 'true');
  }

  const suffix = params.toString();
  const response = await fetch(
    `${chainoraApiBase}/v1/groups/${encodeURIComponent(poolId)}${suffix ? `?${suffix}` : ''}`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load group detail failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<ApiGroup>;
  return normalizeGroupRecord(normalizeEnvelope(raw));
};

export const fetchGroupDetailView = async (
  accessToken: string,
  poolId: string,
  params?: {
    cycle?: number;
    period?: number;
    phase?: GroupPhase;
    sync?: boolean;
  },
): Promise<ApiGroupDetailView> => {
  const query = new URLSearchParams();
  if (typeof params?.cycle === 'number' && Number.isFinite(params.cycle) && params.cycle > 0) {
    query.set('cycle', String(Math.floor(params.cycle)));
  }
  if (typeof params?.period === 'number' && Number.isFinite(params.period) && params.period > 0) {
    query.set('period', String(Math.floor(params.period)));
  }
  if (params?.phase) {
    query.set('phase', params.phase);
  }
  if (params?.sync) {
    query.set('sync', 'true');
  }

  const response = await fetch(
    `${chainoraApiBase}/v1/groups/${encodeURIComponent(poolId)}/view${query.size > 0 ? `?${query.toString()}` : ''}`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load group phase view failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<ApiGroupDetailView>;
  const normalized = normalizeEnvelope(raw);
  return {
    ...normalized,
    group: normalizeGroupRecord(normalized.group),
  };
};

export const createGroupRecord = async (
  accessToken: string,
  payload: CreateGroupPayload,
): Promise<ApiGroup> => {
  const response = await fetch(
    `${chainoraApiBase}/v1/groups`,
    withAccessToken(accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  if (!response.ok) {
    throw new Error(`Create group record failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<ApiGroup>;
  return normalizeGroupRecord(normalizeEnvelope(raw));
};

import { chainoraApiBase } from '../configs/api';

export type GroupScope = 'all' | 'mine' | 'recruiting';

export type ApiGroup = {
  poolId: string;
  poolAddress: string;
  creatorAddress: string;
  name: string;
  description: string;
  contributionAmount: string;
  targetMembers: number;
  periodDuration: number;
  contributionWindow: number;
  auctionWindow: number;
  status: number;
  currentCycle: string;
  currentPeriod: string;
  activeMemberCount: number;
  cycleCompleted: boolean;
  txHash: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type Envelope<T> = T | { success?: boolean; data?: T };

export type CreateGroupPayload = {
  poolId: string;
  poolAddress: string;
  name: string;
  description: string;
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
): Promise<ApiGroup[]> => {
  const params = new URLSearchParams();
  params.set('scope', scope);
  if (q.trim() !== '') {
    params.set('q', q.trim());
  }

  const response = await fetch(
    `${chainoraApiBase}/v1/groups?${params.toString()}`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load groups failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<ApiGroup[]>;
  return normalizeEnvelope(raw);
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
  return normalizeEnvelope(raw);
};

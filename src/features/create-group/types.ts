export type DurationForm = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

export type DurationValue = {
  days: string | number;
  hours: string | number;
  minutes: string | number;
  seconds: string | number;
};

export type FormState = {
  name: string;
  description: string;
  groupImageUrl: string;
  groupVisibility: 'public' | 'private';
  minReputationScore: string;
  amountPerPeriod: string;
  targetMembers: string;
  periodDuration: DurationForm;
  auctionWindow: DurationForm;
  contributionWindow: DurationForm;
};

export type FieldErrors = {
  name?: string;
  description?: string;
  groupImageUrl?: string;
  groupVisibility?: string;
  minReputationScore?: string;
  amountPerPeriod?: string;
  targetMembers?: string;
  periodDuration?: string;
  auctionWindow?: string;
  contributionWindow?: string;
};

export type ContractDurations = {
  periodDurationSeconds: number;
  auctionWindowSeconds: number;
  contributionWindowSeconds: number;
};

export type CreateGroupIconName =
  | 'basic'
  | 'name'
  | 'description'
  | 'image'
  | 'reputation'
  | 'timing'
  | 'periodDuration'
  | 'auctionWindow'
  | 'contributionWindow'
  | 'finance'
  | 'paymentToken'
  | 'amount'
  | 'members'
  | 'decimals'
  | 'summary';

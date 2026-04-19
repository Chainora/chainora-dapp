import { z } from 'zod';

import type {
  ContractDurations,
  DurationForm,
  DurationValue,
  FormState,
} from './types';

export const CONTRIBUTION_SYMBOL =
  (import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL as string | undefined) ?? 'tcUSD';
export const CURRENCY_DECIMALS = Number(import.meta.env.VITE_CHAINORA_TOKEN_DECIMALS ?? 18);

export const reputationOptions = [0, 50, 150, 300, 500, 800];

const durationSchema = z.object({
  days: z.coerce.number().int().min(0),
  hours: z.coerce.number().int().min(0).max(23),
  minutes: z.coerce.number().int().min(0).max(59),
  seconds: z.coerce.number().int().min(0).max(59),
});

export const createGroupSchema = z
  .object({
    name: z.string().trim().min(3, 'Group name must be at least 3 characters.').max(120),
    description: z.string().trim().max(300).default(''),
    groupImageUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .refine(value => !value || /^https?:\/\/.+/i.test(value), 'Group image URL must be a valid http(s) URL.'),
    groupVisibility: z.enum(['public', 'private']),
    minReputationScore: z.coerce.number().int().min(0),
    amountPerPeriod: z
      .string()
      .trim()
      .min(1, 'Amount per period is required.')
      .refine(value => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0;
      }, 'Amount per period must be greater than 0.'),
    targetMembers: z
      .coerce
      .number()
      .int()
      .min(3, 'Group must have at least 3 members.')
      .max(255),
    periodDuration: durationSchema,
    auctionWindow: durationSchema,
    contributionWindow: durationSchema,
  })
  .superRefine((value, ctx) => {
    const contract = toContractDurations(value.periodDuration, value.auctionWindow, value.contributionWindow);
    if (contract.periodDurationSeconds <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodDuration'],
        message: 'Period duration must be greater than 0.',
      });
    }

    if (contract.auctionWindowSeconds <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['auctionWindow'],
        message: 'Auction window must be greater than 0.',
      });
    }

    if (contract.contributionWindowSeconds <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contributionWindow'],
        message: 'Contribution window must be greater than 0.',
      });
    }

    if (contract.auctionWindowSeconds + contract.contributionWindowSeconds >= contract.periodDurationSeconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contributionWindow'],
        message:
          'Contract rule: auctionWindow (bidding) + contributionWindow (post-auction distribution window) must be less than periodDuration.',
      });
    }
  });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

const defaultDuration = (days: number, hours: number, minutes = 0, seconds = 0): DurationForm => ({
  days: String(days),
  hours: String(hours),
  minutes: String(minutes),
  seconds: String(seconds),
});

export const defaultForm: FormState = {
  name: '',
  description: '',
  groupImageUrl: '',
  groupVisibility: 'public',
  minReputationScore: '0',
  amountPerPeriod: '100',
  targetMembers: '10',
  periodDuration: defaultDuration(7, 0),
  auctionWindow: defaultDuration(1, 0),
  contributionWindow: defaultDuration(2, 0),
};

export const toSeconds = (duration: DurationValue): number => {
  const days = Number(duration.days || '0');
  const hours = Number(duration.hours || '0');
  const minutes = Number(duration.minutes || '0');
  const seconds = Number(duration.seconds || '0');
  return (
    Math.max(0, Math.floor(days)) * 86400
    + Math.max(0, Math.floor(hours)) * 3600
    + Math.max(0, Math.floor(minutes)) * 60
    + Math.max(0, Math.floor(seconds))
  );
};

export const toContractDurations = (
  periodDuration: DurationValue,
  auctionWindow: DurationValue,
  contributionWindow: DurationValue,
): ContractDurations => ({
  periodDurationSeconds: toSeconds(periodDuration),
  auctionWindowSeconds: toSeconds(auctionWindow),
  contributionWindowSeconds: toSeconds(contributionWindow),
});

export const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = safeSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${remainSeconds}s`;
};

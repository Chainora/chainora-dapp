import type { ChangeEvent } from 'react';

import {
  CONTRIBUTION_SYMBOL,
  CURRENCY_DECIMALS,
  formatDuration,
  reputationOptions,
  toContractDurations,
} from './formSchema';
import { DurationInput, FieldLabel, IconBadge } from './ui';
import type { DurationForm, FieldErrors, FormState } from './types';

type SharedSectionProps = {
  form: FormState;
  errors: FieldErrors;
  setField: (field: keyof FormState, value: string) => void;
};

type BasicInfoSectionProps = SharedSectionProps & {
  isUploadingGroupImage: boolean;
  onGroupImageChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export function BasicInfoSection({
  form,
  errors,
  setField,
  isUploadingGroupImage,
  onGroupImageChange,
}: BasicInfoSectionProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <IconBadge icon="basic" tone="bg-sky-100 text-sky-700" />
        Basic Information
      </h2>
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="group-name" icon="name">
            Group Name *
          </FieldLabel>
          <input
            id="group-name"
            value={form.name}
            onChange={event => setField('name', event.target.value)}
            placeholder={`e.g. ${CONTRIBUTION_SYMBOL} Savings April 2026`}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          {errors.name ? <p className="mt-1 text-sm text-rose-600">{errors.name}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor="description" icon="description">
            Description
          </FieldLabel>
          <textarea
            id="description"
            value={form.description}
            onChange={event => setField('description', event.target.value)}
            placeholder="Brief introduction about this group..."
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          {errors.description ? <p className="mt-1 text-sm text-rose-600">{errors.description}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2">
              <IconBadge icon="image" />
              Group image (recommended)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Upload one image before signing so native app can persist it with the group record. Image is auto-resized/compressed before upload.</p>
          <div className="mt-3 flex items-center gap-4">
            {form.groupImageUrl ? (
              <img src={form.groupImageUrl} alt="Group preview" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-300" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-200 text-xs text-slate-600">No image</div>
            )}
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
              {isUploadingGroupImage ? 'Uploading...' : form.groupImageUrl ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingGroupImage}
                onChange={event => {
                  void onGroupImageChange(event);
                }}
              />
            </label>
          </div>
          {errors.groupImageUrl ? <p className="mt-2 text-sm text-rose-600">{errors.groupImageUrl}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor="group-visibility" icon="members">
            Group Visibility
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setField('groupVisibility', 'public')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                form.groupVisibility === 'public'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setField('groupVisibility', 'private')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                form.groupVisibility === 'private'
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Private
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Public groups appear in public dashboard discovery. Private groups only appear in your private dashboard mode.
          </p>
          {errors.groupVisibility ? <p className="mt-1 text-sm text-rose-600">{errors.groupVisibility}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor="reputation" icon="reputation">
            Minimum reputation score to join
          </FieldLabel>
          <select
            id="reputation"
            value={form.minReputationScore}
            onChange={event => setField('minReputationScore', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          >
            {reputationOptions.map(option => (
              <option key={option} value={String(option)}>
                {option === 0 ? 'No requirement (0 pts)' : `${option}+ pts`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  );
}

type TimingSectionProps = SharedSectionProps & {
  setDurationField: (field: 'periodDuration' | 'auctionWindow' | 'contributionWindow', value: DurationForm) => void;
};

export function TimingSection({ form, errors, setDurationField }: TimingSectionProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <IconBadge icon="timing" tone="bg-violet-100 text-violet-700" />
        Period Timing (Duration-based)
      </h2>
      <div className="space-y-4">
        <DurationInput
          label="Period Duration"
          iconName="periodDuration"
          value={form.periodDuration}
          onChange={next => setDurationField('periodDuration', next)}
          helper="Total duration of one period."
          inputHint="Total cycle"
          error={errors.periodDuration}
        />

        <DurationInput
          label="Auction Window"
          iconName="auctionWindow"
          value={form.auctionWindow}
          onChange={next => setDurationField('auctionWindow', next)}
          helper="Duration during which bidding/auction takes place."
          inputHint="Bidding"
          error={errors.auctionWindow}
        />

        <DurationInput
          label="Contribution Window"
          iconName="contributionWindow"
          value={form.contributionWindow}
          onChange={next => setDurationField('contributionWindow', next)}
          helper="Post-auction window used to activate distribution of tokens to members."
          inputHint="Distribution"
          error={errors.contributionWindow}
        />
      </div>
    </article>
  );
}

export function FinancialSection({ form, errors, setField }: SharedSectionProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <IconBadge icon="finance" tone="bg-emerald-100 text-emerald-700" />
        Financial Settings
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="payment-token" icon="paymentToken">
            Payment Token
          </FieldLabel>
          <input
            id="payment-token"
            value={CONTRIBUTION_SYMBOL}
            disabled
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
          />
        </div>

        <div>
          <FieldLabel htmlFor="amount-per-period" icon="amount">
            Amount Per Period ({CONTRIBUTION_SYMBOL}) *
          </FieldLabel>
          <input
            id="amount-per-period"
            value={form.amountPerPeriod}
            onChange={event => setField('amountPerPeriod', event.target.value)}
            placeholder="100"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          {errors.amountPerPeriod ? <p className="mt-1 text-sm text-rose-600">{errors.amountPerPeriod}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor="members" icon="members">
            Number of Members *
          </FieldLabel>
          <input
            id="members"
            type="number"
            min={3}
            max={255}
            value={form.targetMembers}
            onChange={event => setField('targetMembers', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          {errors.targetMembers ? <p className="mt-1 text-sm text-rose-600">{errors.targetMembers}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor="token-decimals" icon="decimals">
            Token Decimals (from contract)
          </FieldLabel>
          <input
            id="token-decimals"
            value={String(CURRENCY_DECIMALS)}
            disabled
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
          />
        </div>
      </div>
    </article>
  );
}

export function ContractSummarySection({
  form,
  totalPot,
}: {
  form: FormState;
  totalPot: number;
}) {
  const contractTimes = toContractDurations(form.periodDuration, form.auctionWindow, form.contributionWindow);

  return (
    <article className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
      <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
        <IconBadge icon="summary" tone="bg-blue-100 text-blue-700" />
        Contract Summary
      </h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p>visibility: {form.groupVisibility === 'public' ? 'Public discovery' : 'Private invite-only'}</p>
        <p>contributionAmount: {form.amountPerPeriod || '0'} {CONTRIBUTION_SYMBOL}</p>
        <p>targetMembers: {form.targetMembers || '0'}</p>
        <p>periodDuration: {contractTimes.periodDurationSeconds.toLocaleString()}s ({formatDuration(contractTimes.periodDurationSeconds)})</p>
        <p>auctionWindow: {contractTimes.auctionWindowSeconds.toLocaleString()}s ({formatDuration(contractTimes.auctionWindowSeconds)})</p>
        <p>contributionWindow: {contractTimes.contributionWindowSeconds.toLocaleString()}s ({formatDuration(contractTimes.contributionWindowSeconds)})</p>
        <p>Total cycle potential: {totalPot.toLocaleString()} {CONTRIBUTION_SYMBOL}</p>
      </div>
    </article>
  );
}

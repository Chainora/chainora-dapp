import { formatDuration, toContractDurations } from '../formSchema';
import type { DurationForm, FieldErrors, FormState } from '../types';
import { DurationInput } from '../ui';
import { PhaseBar } from './PhaseBar';
import { SidePreview, type SidePreviewRow } from './SidePreview';

type Step2TimingProps = {
  form: FormState;
  errors: FieldErrors;
  setDurationField: (
    field: 'periodDuration' | 'auctionWindow' | 'contributionWindow',
    value: DurationForm,
  ) => void;
};

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-xl)',
  padding: 28,
} as const;

const infoCardStyle = {
  marginTop: 'var(--s-5)',
  padding: '14px 16px',
  background:
    'linear-gradient(135deg, rgba(40,151,255,0.06), transparent 70%)',
  border: '1px solid rgba(40,151,255,0.25)',
  borderRadius: 'var(--r-md)',
} as const;

export function Step2Timing({ form, errors, setDurationField }: Step2TimingProps) {
  const contractTimes = toContractDurations(
    form.periodDuration,
    form.auctionWindow,
    form.contributionWindow,
  );
  const payoutSec = Math.max(
    0,
    contractTimes.periodDurationSeconds
      - contractTimes.contributionWindowSeconds
      - contractTimes.auctionWindowSeconds,
  );
  const members = Number(form.targetMembers || '0');
  const totalSec = contractTimes.periodDurationSeconds * Math.max(0, members);

  const previewRows: SidePreviewRow[] = [
    { label: 'Period', value: formatDuration(contractTimes.periodDurationSeconds), mono: true },
    {
      label: 'Contribution',
      value: formatDuration(contractTimes.contributionWindowSeconds),
      mono: true,
    },
    {
      label: 'Auction',
      value: formatDuration(contractTimes.auctionWindowSeconds),
      mono: true,
    },
    { label: 'Payout', value: formatDuration(payoutSec), mono: true },
    { label: 'Cycles', value: members > 0 ? `${members} (= members)` : '—' },
    {
      label: 'Total',
      value: members > 0 ? `≈ ${formatDuration(totalSec)}` : '—',
      mono: true,
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
      <div style={cardStyle}>
        <DurationInput
          label="Period length"
          iconName="periodDuration"
          value={form.periodDuration}
          onChange={next => setDurationField('periodDuration', next)}
          helper="Total duration of one period."
          inputHint="Period"
          error={errors.periodDuration}
        />

        <p className="t-tiny c-4 mt-2">
          Tip: 1 week = close-knit · 2 weeks = balanced · 1 month = most common.
        </p>

        <div className="mt-6">
          <p className="t-label mb-[10px]">Phase split within one period</p>
          <PhaseBar
            contribSec={contractTimes.contributionWindowSeconds}
            auctionSec={contractTimes.auctionWindowSeconds}
            periodSec={contractTimes.periodDurationSeconds}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-[18px] md:grid-cols-2">
          <DurationInput
            label="Contribution window"
            iconName="contributionWindow"
            value={form.contributionWindow}
            onChange={next => setDurationField('contributionWindow', next)}
            helper="Time members have to deposit each period."
            inputHint="Deposit"
            error={errors.contributionWindow}
          />
          <DurationInput
            label="Auction window"
            iconName="auctionWindow"
            value={form.auctionWindow}
            onChange={next => setDurationField('auctionWindow', next)}
            helper="Bidding window after deposits close."
            inputHint="Bidding"
            error={errors.auctionWindow}
          />
        </div>

        <div className="flex items-start gap-3" style={infoCardStyle}>
          <span
            className="t-mono inline-flex h-5 w-5 shrink-0 items-center justify-center"
            style={{
              background: 'rgba(40,151,255,0.18)',
              color: 'var(--signal-300)',
              borderRadius: '50%',
              fontSize: 11,
            }}
            aria-hidden="true"
          >
            i
          </span>
          <p className="t-small c-2" style={{ lineHeight: 1.55 }}>
            <span className="c-1 font-semibold">Group auto-starts</span> when all members deposit.
            Payout window = period − (contribution + auction). Final cycle settles within 24h.
          </p>
        </div>
      </div>

      <SidePreview
        title="Cadence summary"
        rows={previewRows}
        note="Pool starts automatically when all members deposit — no fixed start date."
      />
    </div>
  );
}

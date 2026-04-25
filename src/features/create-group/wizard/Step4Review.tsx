import { Button } from '../../../components/ui/Button';
import {
  CONTRIBUTION_SYMBOL,
  formatDuration,
  toContractDurations,
} from '../formSchema';
import type { FormState } from '../types';
import { resolveTier } from './CreditScoreGate';
import { ReviewCard, type ReviewCardRow } from './ReviewCard';

type Step4ReviewProps = {
  form: FormState;
  ownerAddress: string | null;
  ownerLabel: string;
  statusMessage: string;
  reviewError: string;
  isSubmitting: boolean;
  isSuccess: boolean;
  isSignDisabled: boolean;
  onEditStep: (step: 0 | 1 | 2) => void;
  onSign: () => void;
  onGoToDashboard: () => void;
};

const truncateAddress = (raw: string | null): string => {
  if (!raw) {
    return '—';
  }
  const trimmed = raw.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

const formatAmount = (raw: string): string => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '0';
  }
  return parsed.toLocaleString();
};

const safetyCheckRowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  padding: '5px 0',
} as const;

const safetyCheckBadgeStyle = (ok: boolean) =>
  ({
    width: 16,
    height: 16,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 1,
    background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
    color: ok ? 'var(--ok-300)' : 'var(--warn-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
  }) as const;

const signPanelStyle = {
  background:
    'linear-gradient(180deg, rgba(40,151,255,0.12), var(--ink-2) 60%)',
  border: '1px solid rgba(40,151,255,0.4)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  marginBottom: 12,
  boxShadow: '0 20px 60px -20px rgba(40,151,255,0.3)',
} as const;

const gasCellStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-sm)',
  padding: '10px 12px',
} as const;

const signerCardStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
  padding: 14,
  marginBottom: 12,
} as const;

const avatarStyle = {
  background: 'linear-gradient(135deg, var(--signal-400), var(--arc-400))',
  borderRadius: '50%',
} as const;

const helperCardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '16px 18px',
  fontSize: 12,
  color: 'var(--haze-3)',
  lineHeight: 1.55,
} as const;

const safetyCardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '18px 20px',
} as const;

export function Step4Review({
  form,
  ownerAddress,
  ownerLabel,
  statusMessage,
  reviewError,
  isSubmitting,
  isSuccess,
  isSignDisabled,
  onEditStep,
  onSign,
  onGoToDashboard,
}: Step4ReviewProps) {
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
  const amount = Number(form.amountPerPeriod || '0');
  const totalPot = Number.isFinite(amount * members) ? amount * members : 0;
  const truncatedOwner = truncateAddress(ownerAddress);
  const score = Number.parseInt(form.minReputationScore || '0', 10) || 0;
  const tier = resolveTier(score);

  const basicsRows: ReviewCardRow[] = [
    { label: 'Group name', value: form.name.trim() || '—' },
    { label: 'Members', value: `${form.targetMembers || 0} people` },
    { label: 'Owner', value: truncatedOwner, mono: true },
    {
      label: 'Visibility',
      value: form.groupVisibility === 'public' ? 'Public discovery' : 'Private invite-only',
    },
  ];

  const cadenceRows: ReviewCardRow[] = [
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
      value: members > 0
        ? `≈ ${formatDuration(contractTimes.periodDurationSeconds * members)}`
        : '—',
      mono: true,
    },
  ];

  const financeRows: ReviewCardRow[] = [
    { label: 'Token', value: CONTRIBUTION_SYMBOL },
    {
      label: 'Per period',
      value: `${formatAmount(form.amountPerPeriod)} ${CONTRIBUTION_SYMBOL}`,
      mono: true,
    },
    {
      label: 'Total pot',
      value: `${formatAmount(String(totalPot))} ${CONTRIBUTION_SYMBOL}`,
      mono: true,
    },
    { label: 'Min reputation', value: `${score} · ${tier.label}` },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-4">
        <ReviewCard step="01" title="Basics" rows={basicsRows} onEdit={() => onEditStep(0)} />
        <ReviewCard
          step="02"
          title="Cadence & cycles"
          rows={cadenceRows}
          onEdit={() => onEditStep(1)}
        />
        <ReviewCard
          step="03"
          title="Finance"
          rows={financeRows}
          onEdit={() => onEditStep(2)}
        />

        <div style={safetyCardStyle}>
          <div className="mb-[10px] flex items-center gap-2">
            <span
              className="inline-flex h-[14px] w-[14px] items-center justify-center text-[10px] font-bold"
              style={{ color: 'var(--ok-300)' }}
              aria-hidden="true"
            >
              ✓
            </span>
            <p className="text-[13px] font-semibold c-1">Safety checks</p>
          </div>
          <div style={safetyCheckRowStyle}>
            <span style={safetyCheckBadgeStyle(true)}>✓</span>
            <p className="t-small c-2" style={{ lineHeight: 1.5 }}>
              Smart contract uses the audited Chainora pool implementation.
            </p>
          </div>
          <div style={safetyCheckRowStyle}>
            <span style={safetyCheckBadgeStyle(true)}>✓</span>
            <p className="t-small c-2" style={{ lineHeight: 1.5 }}>
              Schema validates contribution + auction &lt; period before signing.
            </p>
          </div>
          <div style={safetyCheckRowStyle}>
            <span style={safetyCheckBadgeStyle(false)}>!</span>
            <p className="t-small c-2" style={{ lineHeight: 1.5 }}>
              Once deployed, the schedule is immutable. Confirm dates before signing.
            </p>
          </div>
        </div>
      </div>

      <aside className="self-start sticky top-2">
        <div style={signPanelStyle}>
          <p className="t-label c-signal mb-3">Ready to deploy</p>

          <div className="mb-[18px] grid grid-cols-2 gap-[10px]">
            <div style={gasCellStyle}>
              <p
                className="t-tiny font-semibold uppercase c-4"
                style={{ letterSpacing: '0.12em', marginBottom: 4 }}
              >
                Deploy gas
              </p>
              <p className="t-mono tabular-nums font-semibold c-1" style={{ fontSize: 14 }}>
                ≈ 0.0012 ETH
              </p>
              <p className="t-tiny c-4 mt-[2px]">estimated</p>
            </div>
            <div style={gasCellStyle}>
              <p
                className="t-tiny font-semibold uppercase c-4"
                style={{ letterSpacing: '0.12em', marginBottom: 4 }}
              >
                Time
              </p>
              <p className="t-mono tabular-nums font-semibold c-1" style={{ fontSize: 14 }}>
                ≈ 18s
              </p>
              <p className="t-tiny c-4 mt-[2px]">1 block · 2 confirmations</p>
            </div>
          </div>

          <div style={signerCardStyle} className="flex items-center gap-[10px]">
            <span
              className="inline-flex h-8 w-8 items-center justify-center text-[13px] font-bold text-white"
              style={avatarStyle}
            >
              {ownerLabel}
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-small c-1 font-semibold truncate">Sign with connected wallet</p>
              <p className="t-mono c-3 truncate" style={{ fontSize: 11 }}>
                {truncatedOwner}
              </p>
            </div>
            <span className="chip chip-ok" style={{ height: 20 }}>
              connected
            </span>
          </div>

          {isSuccess ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={onGoToDashboard}
            >
              Go to dashboard
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={isSignDisabled}
              onClick={onSign}
            >
              {isSubmitting ? 'Signing…' : 'Sign & deploy group'}
            </Button>
          )}

          {reviewError ? (
            <p className="t-tiny c-risk mt-3 text-center" style={{ lineHeight: 1.5 }}>
              {reviewError}
            </p>
          ) : null}

          <p className="t-tiny c-4 mt-3 text-center" style={{ lineHeight: 1.5 }}>
            {statusMessage || 'Will open QR for mobile signing. Action cannot be cancelled by one party.'}
          </p>
        </div>

        <div style={helperCardStyle}>
          <span className="c-1 font-semibold">After signing:</span> the contract goes live and you
          receive a QR to invite the remaining members. Members deposit before cycle 1 begins.
        </div>
      </aside>
    </div>
  );
}

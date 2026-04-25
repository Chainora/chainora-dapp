import { CONTRIBUTION_SYMBOL } from '../formSchema';
import type { FieldErrors, FormState } from '../types';
import { CreditScoreGate, resolveTier } from './CreditScoreGate';
import { SidePreview, type SidePreviewRow } from './SidePreview';

type Step3FinancialProps = {
  form: FormState;
  errors: FieldErrors;
  setField: (field: keyof FormState, value: string) => void;
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

const labelClass = 't-tiny font-semibold uppercase';
const labelStyle = { letterSpacing: '0.12em', color: 'var(--haze-3)' } as const;
const helperClass = 't-tiny c-4';

const formatAmount = (raw: string): string => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '0';
  }
  return parsed.toLocaleString();
};

export function Step3Financial({ form, errors, setField }: Step3FinancialProps) {
  const score = Number.parseInt(form.minReputationScore || '0', 10) || 0;
  const tier = resolveTier(score);
  const amount = Number(form.amountPerPeriod || '0');
  const members = Number(form.targetMembers || '0');
  const totalPot = Number.isFinite(amount * members) ? amount * members : 0;

  const previewRows: SidePreviewRow[] = [
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
    { label: 'Mechanism', value: 'Public auction' },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
      <div style={cardStyle}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] md:grid-cols-2">
          <div className="space-y-[6px]">
            <label htmlFor="step3-token" className={labelClass} style={labelStyle}>
              Payment token
            </label>
            <input
              id="step3-token"
              className="input"
              value={CONTRIBUTION_SYMBOL}
              disabled
            />
            <p className={helperClass}>Token is bound to the deployed contract.</p>
          </div>

          <div className="space-y-[6px]">
            <label htmlFor="step3-amount" className={labelClass} style={labelStyle}>
              Amount per period
            </label>
            <div className="relative">
              <input
                id="step3-amount"
                className="input t-mono tabular-nums"
                value={form.amountPerPeriod}
                onChange={event => setField('amountPerPeriod', event.target.value)}
                placeholder="100"
                style={{ paddingRight: 56 }}
              />
              <span
                className="t-tiny c-3 pointer-events-none absolute inset-y-0 right-3 flex items-center font-semibold"
              >
                {CONTRIBUTION_SYMBOL}
              </span>
            </div>
            {errors.amountPerPeriod ? (
              <p className="t-tiny c-risk">{errors.amountPerPeriod}</p>
            ) : (
              <p className={helperClass}>Each member contributes this amount per cycle.</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-[10px] flex items-baseline justify-between">
            <span className={labelClass} style={labelStyle}>
              Minimum reputation score
            </span>
            <span className="t-tiny c-4">Chainora · 0–1000</span>
          </div>
          <CreditScoreGate
            value={score}
            onChange={next => setField('minReputationScore', String(next))}
          />
          {errors.minReputationScore ? (
            <p className="t-tiny c-risk mt-2">{errors.minReputationScore}</p>
          ) : null}
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
            <span className="c-1 font-semibold">Public auction</span> is the default mechanism — the
            highest bidder receives the pot, and the bid amount is deducted equally from the
            remaining members.
          </p>
        </div>
      </div>

      <SidePreview
        title="Finance summary"
        rows={previewRows}
        note="Auction winner receives the pot minus the bid amount, distributed to non-winners."
      />
    </div>
  );
}

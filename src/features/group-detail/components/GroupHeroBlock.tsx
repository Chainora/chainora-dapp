import { Fragment, useMemo, useState } from 'react';

import type { ApiGroup } from '../../../services/groupsService';
import type { GroupStatus } from '../../../services/groupStatus';
import type { CompactUiPhase } from '../compactConfig';
import { useCountdown } from '../hooks/useCountdown';
import { secondsLabel } from '../utils';
import { StatusBadge } from './StatusBadge';

type GroupHeroBlockProps = {
  group: ApiGroup;
  groupStatus: GroupStatus;
  currentCycle: number;
  uiPhase: CompactUiPhase;
  membersLabel: string;
  contributionLabel: string;
  totalPayoutLabel: string;
  bestDiscountLabel: string;
  deadlineEpochSeconds: number | null;
  paidThisPeriodLabel: string;
  paidIsComplete: boolean;
  chainName: string;
};

type PillState = 'done' | 'active' | 'pending';

const STAGES: Array<{ key: string; label: string }> = [
  { key: 'contribute', label: 'Contribute' },
  { key: 'lock', label: 'Lock' },
  { key: 'auction', label: 'Auction' },
  { key: 'award', label: 'Award' },
  { key: 'settle', label: 'Settle' },
];

const phaseToActiveIndex = (phase: CompactUiPhase): number => {
  switch (phase) {
    case 'funding':
      return 0;
    case 'bidding':
      return 2;
    case 'payout':
      return 3;
    case 'ending':
      return 4;
    case 'forming':
    default:
      return -1;
  }
};

const resolveStageState = (
  stageIndex: number,
  activeIndex: number,
  groupStatus: GroupStatus,
): PillState => {
  if (groupStatus === 'archived') return 'done';
  if (activeIndex < 0) return 'pending';
  if (stageIndex < activeIndex) return 'done';
  if (stageIndex === activeIndex) return 'active';
  if (stageIndex === 1 && activeIndex >= 2) return 'done';
  return 'pending';
};

const lifecycleTone = (status: GroupStatus): 'warning' | 'info' | 'success' | 'muted' | 'danger' => {
  switch (status) {
    case 'forming':
      return 'warning';
    case 'funding':
    case 'bidding':
    case 'payout':
    case 'ended_period':
    case 'voting_extension':
      return 'info';
    case 'deadlinepassed':
      return 'danger';
    case 'archived':
      return 'success';
    default:
      return 'muted';
  }
};

const lifecycleLabel = (status: GroupStatus): string => {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ');
};

const truncateAddress = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

const formatCreatedAt = (raw: string): string => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const computeInitials = (name: string): string => {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'GP';
  const parts = trimmed.split(/\s+/u).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  return parts.slice(0, 3).map(part => part.charAt(0).toUpperCase()).join('');
};

const heroCardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-xl)',
  overflow: 'hidden',
} as const;

const titleStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 36,
  letterSpacing: '-0.045em',
  lineHeight: 1,
  margin: '6px 0 12px',
} as const;

const heroRightStyle = {
  padding: 24,
  background: 'linear-gradient(135deg, rgba(40,151,255,0.08), transparent 60%)',
  borderLeft: '1px solid var(--ink-5)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 10,
};

const miniCardStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
  padding: '10px 12px',
} as const;

const labelStyle = {
  fontSize: 10,
  color: 'var(--haze-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  marginBottom: 4,
};

const brandSquareStyle = {
  height: 110,
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--ink-5)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  display: 'flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const brandFallbackBg = {
  background:
    'radial-gradient(closest-side at 40% 40%, rgba(40,151,255,0.5), transparent 60%), linear-gradient(135deg, #13263d, #0b1422)',
};

const brandTextStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 36,
  letterSpacing: '-0.04em',
  color: 'var(--signal-300)',
  fontVariantNumeric: 'tabular-nums' as const,
};

const metricsStripStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  background: 'var(--ink-1)',
  borderTop: '1px solid var(--ink-5)',
} as const;

const metricCellStyle = {
  padding: '16px 20px',
} as const;

const metricLabelStyle = {
  fontSize: 10,
  color: 'var(--haze-3)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

const metricValueBaseStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 22,
  letterSpacing: '-0.03em',
  marginTop: 4,
  fontVariantNumeric: 'tabular-nums',
} as const;

const lifecycleRowStyle = {
  marginTop: 18,
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center' as const,
  gap: 10,
};

function UsersIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" />
      <path d="M2 13c.5-2 2-3 4-3s3.5 1 4 3" />
      <circle cx="12" cy="7" r="2" />
      <path d="M10 13.5c.4-1.4 1.4-2.2 2.5-2.2" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="8" cy="4" rx="4" ry="1.6" />
      <path d="M4 4v5c0 1 1.8 1.8 4 1.8s4-.8 4-1.8V4" />
      <path d="M4 9c0 1 1.8 1.8 4 1.8s4-.8 4-1.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1.5 3 3.5v4c0 3 2.2 5.6 5 7 2.8-1.4 5-4 5-7v-4l-5-2Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 9.5a2.5 2.5 0 0 1 0-3.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L10 9.5" />
      <path d="M9.5 6.5a2.5 2.5 0 0 1 0 3.5L8 11.5a2.5 2.5 0 0 1-3.5-3.5L6 6.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 2 3v6a1.5 1.5 0 0 0 1.5 1.5H5" />
    </svg>
  );
}

const cadenceLabel = (group: ApiGroup): string => {
  const periodSeconds = group.periodDuration || 0;
  if (periodSeconds <= 0) return 'Custom cadence';
  return `${secondsLabel(periodSeconds)} period`;
};

export function GroupHeroBlock({
  group,
  groupStatus,
  currentCycle,
  uiPhase,
  membersLabel,
  contributionLabel,
  totalPayoutLabel,
  bestDiscountLabel,
  deadlineEpochSeconds,
  paidThisPeriodLabel,
  paidIsComplete,
  chainName,
}: GroupHeroBlockProps) {
  const countdown = useCountdown(deadlineEpochSeconds);
  const [copied, setCopied] = useState(false);
  const createdAtLabel = formatCreatedAt(group.createdAt);
  const minRep = (group.minReputation && group.minReputation.trim()) || '0';
  const poolAddressShort = truncateAddress(group.poolAddress);
  const initials = useMemo(() => computeInitials(group.name), [group.name]);

  const lifecycleStages = useMemo(() => {
    if (uiPhase === 'forming') {
      return null;
    }
    const activeIndex = phaseToActiveIndex(uiPhase);
    return STAGES.map((stage, index) => ({
      ...stage,
      state: resolveStageState(index, activeIndex, groupStatus),
    }));
  }, [groupStatus, uiPhase]);

  const handleCopyAddress = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(group.poolAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const countdownTone = countdown.remainingSeconds > 0 ? 'var(--signal-300)' : 'var(--haze-3)';
  const paidLabelDisplay = uiPhase === 'forming' ? '—' : paidThisPeriodLabel;
  const paidTone = uiPhase === 'forming'
    ? 'var(--haze-3)'
    : paidIsComplete
      ? 'var(--ok-300)'
      : 'var(--haze-1)';
  const bestDiscountTone = bestDiscountLabel === '—' ? 'var(--haze-3)' : 'var(--signal-300)';

  return (
    <article style={heroCardStyle} className="mb-5">
      <div className="grid lg:grid-cols-[1.6fr_1fr]">
        <div style={{ padding: '28px 28px 24px' }}>
          <div className="flex flex-wrap items-center gap-[10px]" style={{ marginBottom: 8 }}>
            <StatusBadge label={lifecycleLabel(groupStatus)} tone={lifecycleTone(groupStatus)} />
            <span className="chip chip-mono">cycle #{currentCycle}</span>
            {createdAtLabel ? (
              <span style={{ fontSize: 11, color: 'var(--haze-4)' }}>Created {createdAtLabel}</span>
            ) : null}
          </div>

          <h1 className="c-1" style={titleStyle}>
            {group.name || 'Untitled group'}
          </h1>

          <p
            className="c-2"
            style={{ fontSize: 13, lineHeight: 1.55, maxWidth: '58ch', margin: 0 }}
          >
            {group.description?.trim() || 'No description provided.'}
          </p>

          <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
            <span className="chip">
              <UsersIcon /> {membersLabel} members
            </span>
            <span className="chip">
              <CoinIcon /> {contributionLabel} / period
            </span>
            <span className="chip">
              <ClockIcon /> {cadenceLabel(group)}
            </span>
            <span className="chip">
              <ShieldIcon /> Min rep {minRep}
            </span>
            <span
              className="chip chip-mono"
              title={group.poolAddress}
              onClick={handleCopyAddress}
              style={{ cursor: 'pointer' }}
            >
              <LinkIcon /> {poolAddressShort}
              {copied ? ' ✓' : ''}
            </span>
          </div>

          {lifecycleStages ? (
            <div style={lifecycleRowStyle}>
              {lifecycleStages.map((stage, index) => (
                <Fragment key={stage.key}>
                  <span className={`pill ${stage.state}`}>
                    <span className="tick" aria-hidden="true">
                      {stage.state === 'done' ? '✓' : ''}
                    </span>
                    {stage.label}
                  </span>
                  {index < lifecycleStages.length - 1 ? (
                    <span className="link-connector" aria-hidden="true" />
                  ) : null}
                </Fragment>
              ))}
            </div>
          ) : (
            <div style={lifecycleRowStyle}>
              <span className="pill active">
                <span className="tick" aria-hidden="true">{''}</span>
                Forming
              </span>
              <span className="t-tiny c-3">Lifecycle starts when the first period opens.</span>
            </div>
          )}
        </div>

        <div style={heroRightStyle}>
          <div
            style={{
              ...brandSquareStyle,
              ...(group.groupImageUrl ? {} : brandFallbackBg),
            }}
          >
            {group.groupImageUrl ? (
              <>
                <img
                  src={group.groupImageUrl}
                  alt={`${group.name} cover`}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ inset: 0 }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(7,8,12,0.55) 100%)',
                    inset: 0,
                  }}
                />
                <span
                  className="absolute right-3 top-3 chip chip-mono"
                  style={{ background: 'rgba(7,8,12,0.55)', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  cycle #{currentCycle}
                </span>
              </>
            ) : (
              <span style={brandTextStyle}>
                {initials}·{currentCycle}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-[10px]">
            <div style={miniCardStyle}>
              <div style={labelStyle}>Contract</div>
              <div
                className="t-mono c-1 inline-flex items-center gap-1"
                style={{ fontSize: 12, cursor: 'pointer' }}
                onClick={handleCopyAddress}
                title={group.poolAddress}
              >
                {poolAddressShort}
                <CopyIcon />
              </div>
            </div>
            <div style={miniCardStyle}>
              <div style={labelStyle}>Chain</div>
              <div className="c-1" style={{ fontSize: 12 }}>
                {chainName}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={metricsStripStyle}>
        {[
          { key: 'totalPayout', label: 'Total payout', value: totalPayoutLabel, color: 'var(--haze-1)' },
          { key: 'paidThisPeriod', label: 'Paid this period', value: paidLabelDisplay, color: paidTone },
          { key: 'bestDiscount', label: 'Best discount', value: bestDiscountLabel, color: bestDiscountTone },
          { key: 'nextEvent', label: 'Next event', value: countdown.label, color: countdownTone },
        ].map((cell, index) => (
          <div
            key={cell.key}
            style={{
              ...metricCellStyle,
              borderRight: index < 3 ? '1px solid var(--ink-5)' : 'none',
            }}
          >
            <div style={metricLabelStyle}>{cell.label}</div>
            <div style={{ ...metricValueBaseStyle, color: cell.color }}>{cell.value}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

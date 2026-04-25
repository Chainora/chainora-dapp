import type { ApiGroup } from '../../services/groupsService';
import type { GroupStatus } from '../../services/groupStatus';
import type { DashboardIconName } from './types';
import {
  deriveDashboardGroupStatus,
  formatAmount,
  isGroupDisabled,
  progressPercent,
  statusMeta,
} from './utils';

const COVER_GRADIENTS: Record<'cyan' | 'dim' | 'signal', string> = {
  cyan:
    'radial-gradient(closest-side at 70% 30%, rgba(34,211,238,0.4), transparent 60%), linear-gradient(135deg, #0a2b33, #04121a)',
  dim: 'linear-gradient(135deg, #151923, #0a0e17)',
  signal:
    'radial-gradient(closest-side at 30% 30%, rgba(40,151,255,0.4), transparent 60%), linear-gradient(135deg, #13263d, #0b1422)',
};

const coverGradientFor = (status: GroupStatus): string => {
  switch (status) {
    case 'forming':
    case 'voting_extension':
      return COVER_GRADIENTS.cyan;
    case 'archived':
    case 'deadlinepassed':
      return COVER_GRADIENTS.dim;
    default:
      return COVER_GRADIENTS.signal;
  }
};

const cardOuterStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  overflow: 'hidden',
  transition: 'box-shadow var(--dur-med) var(--ease-out)',
} as const;

const overlayGradient = 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(7,8,12,0.55) 100%)';

export function DashboardIcon({ name, className = 'h-4 w-4' }: { name: DashboardIconName; className?: string }) {
  switch (name) {
    case 'active':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.3 2.3 4.7-5.1" />
        </svg>
      );
    case 'recruiting':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 18c.8-2.7 2.8-4 5.5-4s4.7 1.3 5.5 4" />
          <path d="M18 8v6M15 11h6" />
        </svg>
      );
    case 'contribution':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <ellipse cx="12" cy="6" rx="5" ry="2.5" />
          <path d="M7 6v6c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6" />
          <path d="M9 18h6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.5 18c.8-2.4 2.6-3.6 4.5-3.6S11.7 15.6 12.5 18" />
          <path d="M11.5 18c.8-2.4 2.6-3.6 4.5-3.6s3.7 1.2 4.5 3.6" />
        </svg>
      );
  }
}

type StatTone = 'ok' | 'warn' | 'signal';

const TONE_STYLES: Record<StatTone, { bg: string; color: string; border: string }> = {
  ok: {
    bg: 'var(--ok-bg)',
    color: 'var(--ok-300)',
    border: 'rgba(16,185,129,0.4)',
  },
  warn: {
    bg: 'var(--warn-bg)',
    color: 'var(--warn-300)',
    border: 'rgba(245,158,11,0.4)',
  },
  signal: {
    bg: 'rgba(40,151,255,0.12)',
    color: 'var(--signal-300)',
    border: 'rgba(40,151,255,0.4)',
  },
};

const accentCardStyle = {
  background: 'linear-gradient(135deg, rgba(40,151,255,0.15), rgba(40,151,255,0.02))',
  border: '1px solid rgba(40,151,255,0.3)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 22px',
} as const;

const plainCardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 22px',
} as const;

const valueStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 40,
  letterSpacing: '-0.04em',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
} as const;

type StatTrendTone = 'ok' | 'warn' | 'signal' | 'muted';

const TREND_COLORS: Record<StatTrendTone, string> = {
  ok: 'var(--ok-300)',
  warn: 'var(--warn-300)',
  signal: 'var(--signal-300)',
  muted: 'var(--haze-3)',
};

function StatCard({
  label,
  value,
  iconName,
  tone,
  accent = false,
  small = false,
  trend,
  trendTone = 'muted',
}: {
  label: string;
  value: string | number;
  iconName: DashboardIconName;
  tone: StatTone;
  accent?: boolean;
  small?: boolean;
  trend?: string;
  trendTone?: StatTrendTone;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <article style={accent ? accentCardStyle : plainCardStyle}>
      <div className="flex items-start justify-between gap-2">
        <p
          className="t-label c-3"
          style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          {label}
        </p>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-md)]"
          style={{ background: toneStyle.bg, color: toneStyle.color, border: `1px solid ${toneStyle.border}` }}
        >
          <DashboardIcon name={iconName} />
        </span>
      </div>
      <p
        className="mt-3"
        style={{
          ...valueStyle,
          fontSize: small ? 26 : 40,
          color: accent ? 'var(--signal-300)' : 'var(--haze-1)',
        }}
      >
        {value}
      </p>
      {trend ? (
        <p
          className="t-mono"
          style={{ fontSize: 11, marginTop: 10, color: TREND_COLORS[trendTone] }}
        >
          {trend}
        </p>
      ) : null}
    </article>
  );
}

export function DashboardStats({
  activeJoinedCount,
  contributionPerPeriod,
  bestBidPayoutEstimate,
  invitesPending,
}: {
  activeJoinedCount: number;
  contributionPerPeriod: string;
  bestBidPayoutEstimate: string;
  invitesPending: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Active joined"
        value={activeJoinedCount}
        iconName="active"
        tone="ok"
        trend={activeJoinedCount > 0 ? 'currently running' : 'no active groups'}
        trendTone={activeJoinedCount > 0 ? 'ok' : 'muted'}
      />
      <StatCard
        label="Contribution / period"
        value={contributionPerPeriod}
        iconName="contribution"
        tone="signal"
        small
        trend="across active joined"
        trendTone="muted"
      />
      <StatCard
        label="Best-bid payout"
        value={bestBidPayoutEstimate}
        iconName="contribution"
        tone="ok"
        small
        trend={bestBidPayoutEstimate === '0' ? 'no winning bid' : 'estimated this round'}
        trendTone={bestBidPayoutEstimate === '0' ? 'muted' : 'ok'}
      />
      <StatCard
        label="Invites pending"
        value={invitesPending}
        iconName="recruiting"
        tone="signal"
        accent
        trend={invitesPending > 0 ? 'awaiting response' : 'all caught up'}
        trendTone={invitesPending > 0 ? 'signal' : 'muted'}
      />
    </div>
  );
}

export function DashboardGroupCard({
  group,
  onOpen,
}: {
  group: ApiGroup;
  onOpen: (poolId: string) => void;
}) {
  const status = statusMeta(group);
  const lifecycle = deriveDashboardGroupStatus(group);
  const progress = progressPercent(group);
  const disabled = isGroupDisabled(group);
  const hasImage = Boolean(group.groupImageUrl);

  return (
    <article
      className={disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
      style={cardOuterStyle}
      onClick={() => {
        if (!disabled) {
          onOpen(group.poolId);
        }
      }}
      onMouseEnter={event => {
        if (!disabled) {
          event.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={event => {
        event.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        className="relative"
        style={{
          height: 72,
          borderBottom: '1px solid var(--ink-5)',
          background: hasImage ? 'var(--ink-3)' : coverGradientFor(lifecycle),
          overflow: 'hidden',
          padding: 12,
        }}
      >
        {hasImage ? (
          <>
            <img
              src={group.groupImageUrl}
              alt={`${group.name} cover`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: overlayGradient }} aria-hidden="true" />
          </>
        ) : null}

        <span
          className={status.classes}
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          ● {status.label}
        </span>
        <span
          className={group.publicRecruitment ? 'chip chip-ok' : 'chip chip-signal'}
          style={{ position: 'absolute', bottom: 10, left: 12 }}
        >
          {group.publicRecruitment ? 'Open' : 'Invite-only'}
        </span>
        {disabled ? (
          <span className="chip chip-risk" style={{ position: 'absolute', bottom: 10, right: 12 }}>
            Disabled
          </span>
        ) : null}
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <h3
          className="c-1 truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
          }}
        >
          {group.name}
        </h3>
        <p
          className="t-small c-3"
          style={{ lineHeight: 1.5, height: 36, overflow: 'hidden', margin: 0 }}
        >
          {group.description || 'No description provided.'}
        </p>

        <p
          className="t-tiny c-4 mt-2 truncate"
          style={{ letterSpacing: '0.04em' }}
        >
          <span className="c-3">Members</span>{' '}
          <span className="t-mono c-2">
            {group.activeMemberCount}/{group.targetMembers}
          </span>
          <span className="mx-2 c-4">·</span>
          <span className="c-3">Min rep</span>{' '}
          <span className="t-mono c-2">{group.minReputation || '0'}</span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          <p
            className="t-tiny c-4"
            style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Per period
          </p>
          <p
            className="t-tiny c-4"
            style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Round
          </p>
          <p className="t-mono c-1 font-medium" style={{ fontSize: 12 }}>
            {formatAmount(group.contributionAmount)}
          </p>
          <p className="t-mono c-1 font-medium" style={{ fontSize: 12 }}>
            Cycle {group.currentCycle} / Period {group.currentPeriod}
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between" style={{ fontSize: 11, color: 'var(--haze-3)' }}>
            <span>Progress</span>
            <b className="t-mono c-1 font-medium">{progress}%</b>
          </div>
          <div className="bar" style={{ height: 5 }}>
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

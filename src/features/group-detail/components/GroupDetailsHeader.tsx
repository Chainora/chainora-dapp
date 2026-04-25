import type { ApiGroup, ApiGroupViewPeriodMeta, GroupPhase, GroupPhaseStatus } from '../../../services/groupsService';
import { phaseLabel } from '../model';
import { StatusBadge } from './StatusBadge';
import { PhaseCountdown } from './PhaseCountdown';

const lifecycleTone = (status: string): 'warning' | 'info' | 'success' | 'muted' => {
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
      return 'warning';
    case 'archived':
      return 'success';
    default:
      return 'muted';
  }
};

const lifecycleLabel = (status: string): string => {
  if (!status) {
    return 'unknown';
  }
  return status.replace(/_/g, ' ');
};

const toDurationLabel = (seconds: number): string => {
  if (seconds <= 0) {
    return 'N/A';
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
};

const avatarInitial = (name: string): string => {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : 'G';
};

const formatDateTime = (unixSeconds: number): string => {
  if (!unixSeconds || unixSeconds <= 0) {
    return 'N/A';
  }
  return new Date(unixSeconds * 1000).toLocaleString();
};

const getPhaseWindow = (
  phase: GroupPhase,
  periodMeta: ApiGroupViewPeriodMeta | undefined,
): { startAt: number; endAt: number } => {
  if (!periodMeta) {
    return { startAt: 0, endAt: 0 };
  }

  switch (phase) {
    case 'funding':
      return { startAt: periodMeta.startAt, endAt: periodMeta.contributionDeadline };
    case 'bidding':
      return { startAt: periodMeta.contributionDeadline, endAt: periodMeta.auctionDeadline };
    case 'payout':
      return { startAt: periodMeta.auctionDeadline, endAt: periodMeta.periodEndAt };
    case 'ending':
      return { startAt: periodMeta.periodEndAt, endAt: 0 };
    default:
      return { startAt: 0, endAt: 0 };
  }
};

const innerCardStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

export function GroupDetailsHeader({
  group,
  groupStatus,
  activePeriod,
  activePhase,
  membersLabel,
  contributionLabel,
  totalPayoutLabel,
  periodMeta,
  phaseStatus,
  countdownSeconds,
  countdownLabel,
}: {
  group: ApiGroup;
  groupStatus: string;
  activePeriod: number;
  activePhase: GroupPhase;
  membersLabel: string;
  contributionLabel: string;
  totalPayoutLabel: string;
  periodMeta?: ApiGroupViewPeriodMeta;
  phaseStatus: GroupPhaseStatus;
  countdownSeconds: number;
  countdownLabel: string;
}) {
  const phaseWindow = getPhaseWindow(activePhase, periodMeta);
  const stats = [
    { label: 'Members', value: membersLabel },
    { label: 'Per Contribution', value: contributionLabel },
    { label: 'Payout Target', value: totalPayoutLabel },
    { label: 'Contribution Window', value: toDurationLabel(group.contributionWindow) },
    { label: 'Auction Window', value: toDurationLabel(group.auctionWindow) },
  ];

  return (
    <article className="card-raised p-3">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-stretch">
        <div className="min-w-0 px-3 py-2.5" style={innerCardStyle}>
          <div className="flex items-start gap-3">
            <div
              className="relative h-14 w-14 shrink-0 overflow-hidden"
              style={{
                background: 'var(--ink-2)',
                border: '1px solid var(--ink-5)',
                borderRadius: 'var(--r-md)',
              }}
            >
              {group.groupImageUrl ? (
                <img
                  src={group.groupImageUrl}
                  alt={`${group.name} avatar`}
                  loading="lazy"
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-sm font-black"
                  style={{ color: 'var(--haze-2)', fontFamily: 'var(--font-display)' }}
                >
                  {avatarInitial(group.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="t-h3 c-1 truncate" style={{ fontFamily: 'var(--font-display)' }}>
                  {group.name}
                </h1>
                <StatusBadge label={lifecycleLabel(groupStatus)} tone={lifecycleTone(groupStatus)} />
                <StatusBadge label={group.publicRecruitment ? 'Public' : 'Private'} tone="default" />
              </div>
              <p className="t-mono c-3 mt-1 break-all text-[11px]">Pool: {group.poolAddress}</p>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {stats.map(item => (
              <div key={item.label} className="px-2.5 py-1.5" style={innerCardStyle}>
                <p className="t-label" style={{ fontSize: '10px' }}>
                  {item.label}
                </p>
                <p className="t-tiny c-1 mt-0.5 font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="px-3 py-2.5"
          style={{
            background: 'linear-gradient(135deg, rgba(40,151,255,0.08) 0%, rgba(34,211,238,0.06) 100%)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="t-label" style={{ fontSize: '10px' }}>Current Period</p>
              <p className="t-small c-1 font-bold">#{activePeriod}</p>
            </div>
            <div className="text-right">
              <p className="t-label" style={{ fontSize: '10px' }}>Active Phase</p>
              <p className="t-small c-1 font-bold">{phaseLabel(activePhase)}</p>
            </div>
          </div>

          <div className="mt-2.5 px-2.5 py-2" style={innerCardStyle}>
            <PhaseCountdown
              phaseStatus={phaseStatus}
              countdownSeconds={countdownSeconds}
              countdownLabel={countdownLabel}
              variant="hero"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="px-2.5 py-1.5" style={innerCardStyle}>
              <p className="t-label" style={{ fontSize: '10px' }}>Phase Start</p>
              <p className="t-tiny c-1 mt-0.5 font-semibold">{formatDateTime(phaseWindow.startAt)}</p>
            </div>
            <div className="px-2.5 py-1.5" style={innerCardStyle}>
              <p className="t-label" style={{ fontSize: '10px' }}>Phase End</p>
              <p className="t-tiny c-1 mt-0.5 font-semibold">{formatDateTime(phaseWindow.endAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

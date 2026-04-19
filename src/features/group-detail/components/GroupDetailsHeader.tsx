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
    <article className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-stretch">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {group.groupImageUrl ? (
                <img
                  src={group.groupImageUrl}
                  alt={`${group.name} avatar`}
                  loading="lazy"
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-600">
                  {avatarInitial(group.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-900 md:text-xl">{group.name}</h1>
                <StatusBadge label={lifecycleLabel(groupStatus)} tone={lifecycleTone(groupStatus)} />
                <StatusBadge label={group.publicRecruitment ? 'Public' : 'Private'} tone="default" />
              </div>
              <p className="mt-1 break-all text-[11px] font-mono text-slate-500">Pool: {group.poolAddress}</p>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {stats.map(item => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Current Period</p>
              <p className="text-sm font-bold text-slate-900">#{activePeriod}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Active Phase</p>
              <p className="text-sm font-bold text-slate-900">{phaseLabel(activePhase)}</p>
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2">
            <PhaseCountdown
              phaseStatus={phaseStatus}
              countdownSeconds={countdownSeconds}
              countdownLabel={countdownLabel}
              variant="hero"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Phase Start</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{formatDateTime(phaseWindow.startAt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Phase End</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{formatDateTime(phaseWindow.endAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

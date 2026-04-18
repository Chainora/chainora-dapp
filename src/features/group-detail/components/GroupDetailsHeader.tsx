import type { ApiGroup, GroupPhase, GroupPhaseStatus } from '../../../services/groupsService';
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

export function GroupDetailsHeader({
  group,
  groupStatus,
  activePeriod,
  activePhase,
  membersLabel,
  contributionLabel,
  totalPayoutLabel,
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
  phaseStatus: GroupPhaseStatus;
  countdownSeconds: number;
  countdownLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative mt-0.5 h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
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

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-black tracking-tight text-slate-900">{group.name}</h1>
                <StatusBadge label={lifecycleLabel(groupStatus)} tone={lifecycleTone(groupStatus)} />
                <StatusBadge label={group.publicRecruitment ? 'Public' : 'Private'} tone="default" />
              </div>
              <p className="break-all text-xs font-mono text-slate-500">Pool: {group.poolAddress}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current active phase</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Period {activePeriod} / {phaseLabel(activePhase)}
          </p>
          <div className="mt-1.5">
            <PhaseCountdown
              phaseStatus={phaseStatus}
              countdownSeconds={countdownSeconds}
              countdownLabel={countdownLabel}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Members</p>
          <p className="text-xs font-bold text-slate-900">{membersLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Per Contribution</p>
          <p className="text-xs font-bold text-slate-900">{contributionLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Payout Target</p>
          <p className="text-xs font-bold text-slate-900">{totalPayoutLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Contribution Window</p>
          <p className="text-xs font-bold text-slate-900">{toDurationLabel(group.contributionWindow)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Auction Window</p>
          <p className="text-xs font-bold text-slate-900">{toDurationLabel(group.auctionWindow)}</p>
        </div>
      </div>
    </article>
  );
}

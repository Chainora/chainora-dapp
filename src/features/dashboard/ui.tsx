import type { ApiGroup } from '../../services/groupsService';
import type { DashboardIconName } from './types';
import {
  formatAmount,
  formatCadence,
  isGroupDisabled,
  poolEstimate,
  progressPercent,
  statusMeta,
} from './utils';

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

export function DashboardStats({
  activeCount,
  formingCount,
  totalContributed,
}: {
  activeCount: number;
  formingCount: number;
  totalContributed: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active Groups</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <DashboardIcon name="active" />
          </span>
        </div>
        <p className="mt-2 text-4xl font-bold text-slate-900">{activeCount}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Forming</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <DashboardIcon name="recruiting" />
          </span>
        </div>
        <p className="mt-2 text-4xl font-bold text-slate-900">{formingCount}</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contribution / Period</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <DashboardIcon name="contribution" />
          </span>
        </div>
        <p className="mt-2 text-4xl font-bold text-slate-900">{totalContributed}</p>
      </article>
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
  const status = statusMeta(group.status);
  const progress = progressPercent(group);
  const disabled = isGroupDisabled(group);

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition ${
        disabled
          ? 'cursor-not-allowed opacity-70'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      }`}
      onClick={() => {
        if (!disabled) {
          onOpen(group.poolId);
        }
      }}
    >
      {group.groupImageUrl ? (
        <div className="mb-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
          <img src={group.groupImageUrl} alt={`${group.name} cover`} className="h-36 w-full object-cover" />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <DashboardIcon name="group" />
          </span>
          <h3 className="truncate text-xl font-bold text-slate-900">{group.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}>{status.label}</span>
          <span
            className={
              group.publicRecruitment
                ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                : 'rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700'
            }
          >
            {group.publicRecruitment ? 'Public' : 'Private'}
          </span>
          {disabled ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              Disabled
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-500">{group.description || 'No description provided.'}</p>
      {disabled ? (
        <p className="mt-2 text-xs font-medium text-rose-700">No active members. Group is disabled.</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-700">
        <p>{formatAmount(group.contributionAmount)}</p>
        <p>
          {group.activeMemberCount}/{group.targetMembers} members
        </p>
        <p>{formatCadence(group.periodDuration)}</p>
        <p>
          Cycle {group.currentCycle} / Period {group.currentPeriod}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm text-slate-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-700">Pool: {poolEstimate(group)}</div>
    </article>
  );
}

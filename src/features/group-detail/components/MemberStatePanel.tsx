import { StatusBadge } from './StatusBadge';

export type MemberPhaseView = {
  address: string;
  displayLabel: string;
  secondaryLabel: string;
  avatarUrl: string;
  state: string;
  badge: string;
  isCurrentUser: boolean;
  bidAmountRaw?: string | null;
  bidAmountLabel?: string | null;
};

const toneByState = (state: string): 'success' | 'warning' | 'info' | 'muted' => {
  if (['paid', 'best_bidder', 'recipient_claimed', 'completed', 'vote_continue'].includes(state)) {
    return 'success';
  }
  if (['unpaid', 'recipient_pending', 'pending_finalize', 'vote_end'].includes(state)) {
    return 'warning';
  }
  if (['eligible', 'waiting_turn', 'vote_pending'].includes(state)) {
    return 'info';
  }
  return 'muted';
};

const avatarInitial = (label: string): string => {
  const normalized = label.trim();
  return normalized ? normalized[0].toUpperCase() : '?';
};

export function MemberStatePanel({
  members,
  phaseTitle,
}: {
  members: MemberPhaseView[];
  phaseTitle: string;
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Members</h3>
        <StatusBadge label={phaseTitle} tone="default" />
      </div>

      <div className="mt-3 space-y-2">
        {members.map(member => (
          <div
            key={member.address}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={`${member.displayLabel} avatar`}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    {avatarInitial(member.displayLabel)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {member.displayLabel}
                    {member.isCurrentUser ? ' (You)' : ''}
                  </p>
                  <p className="truncate text-xs text-slate-500">{member.secondaryLabel}</p>
                </div>
              </div>
            </div>
            <StatusBadge label={member.badge || member.state} tone={toneByState(member.state)} />
          </div>
        ))}

        {members.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            No members found.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

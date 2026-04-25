import { useMemo } from 'react';

import type { ApiGroupViewHistoryRow } from '../../../services/groupsService';
import { formatInitCompact, formatToken } from '../utils';
import { toInitAddress } from '../../../components/UserDetail';

type ScheduleGridProps = {
  totalPeriods: number;
  activePeriod: number;
  currentCycle: number;
  historyRows: ApiGroupViewHistoryRow[];
  periodStartAt: number;
  periodDuration: number;
};

type CycleCell = {
  n: number;
  state: 'done' | 'active' | 'pending';
  winner: string | null;
  amount: string | null;
  date: string;
};

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 24px',
} as const;

const titleStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: '-0.03em',
  margin: 0,
} as const;

const cellLabelStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: '-0.03em',
} as const;

const formatShortDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const estimateDate = (
  periodNumber: number,
  startAt: number,
  duration: number,
): string => {
  if (!startAt || !duration) return '';
  const offset = (periodNumber - 1) * duration;
  const stamp = (startAt + offset) * 1000;
  return formatShortDate(new Date(stamp));
};

const winnerLabelOf = (recipient: string): string => {
  const init = toInitAddress(recipient) || recipient;
  return formatInitCompact(init);
};

export function ScheduleGrid({
  totalPeriods,
  activePeriod,
  currentCycle,
  historyRows,
  periodStartAt,
  periodDuration,
}: ScheduleGridProps) {
  const cycles = useMemo<CycleCell[]>(() => {
    const safeTotal = Math.max(totalPeriods, activePeriod, 1);
    const matchedHistory = historyRows.filter(row => row.cycle === currentCycle);

    return Array.from({ length: safeTotal }, (_, index) => {
      const periodNumber = index + 1;
      const isDone = periodNumber < activePeriod;
      const isActive = periodNumber === activePeriod;

      const claimedRow = matchedHistory.find(
        row => row.period === periodNumber && row.claimed && row.claimAmount !== '0',
      );
      const fallbackRow = matchedHistory.find(row => row.period === periodNumber && row.claimAmount !== '0');
      const winningRow = claimedRow ?? fallbackRow ?? null;

      return {
        n: periodNumber,
        state: isDone ? 'done' : isActive ? 'active' : 'pending',
        winner: winningRow ? winnerLabelOf(winningRow.member) : null,
        amount: winningRow?.claimAmount ?? null,
        date: estimateDate(periodNumber, periodStartAt, periodDuration),
      };
    });
  }, [activePeriod, currentCycle, historyRows, periodDuration, periodStartAt, totalPeriods]);

  const remaining = Math.max(0, cycles.length - activePeriod);

  return (
    <section style={cardStyle}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 14 }}>
        <h3 className="c-1" style={titleStyle}>
          Schedule · {cycles.length} periods
        </h3>
        <span className="t-tiny c-3">
          Period {Math.min(activePeriod, cycles.length)} / {cycles.length} · {remaining} remaining
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {cycles.map(cell => {
          const isActive = cell.state === 'active';
          const isDone = cell.state === 'done';

          return (
            <div
              key={cell.n}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--r-sm)',
                background: isActive
                  ? 'linear-gradient(180deg, rgba(40,151,255,0.14), rgba(40,151,255,0.02))'
                  : isDone
                    ? 'var(--ink-3)'
                    : 'var(--ink-1)',
                border: isActive
                  ? '1px solid rgba(40,151,255,0.5)'
                  : '1px solid var(--ink-5)',
                boxShadow: isActive ? '0 0 20px -8px var(--signal-400)' : 'none',
                position: 'relative',
                minHeight: 68,
              }}
            >
              <div
                className="flex items-baseline justify-between gap-1"
                style={{ marginBottom: 4 }}
              >
                <span
                  className="inline-flex items-baseline gap-1"
                  style={{
                    ...cellLabelStyle,
                    color: isActive
                      ? 'var(--signal-300)'
                      : isDone
                        ? 'var(--haze-1)'
                        : 'var(--haze-3)',
                  }}
                >
                  P{cell.n}
                  {isDone ? (
                    <span
                      aria-hidden="true"
                      style={{ color: 'var(--ok-300)', fontSize: 11 }}
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
                {(isActive || isDone) && cell.date ? (
                  <span
                    className="t-mono"
                    style={{ fontSize: 10, color: 'var(--haze-4)' }}
                  >
                    {cell.date}
                  </span>
                ) : null}
              </div>

              {cell.winner ? (
                <div
                  className="t-tiny c-2 truncate"
                  style={{ marginBottom: 2 }}
                  title={cell.winner}
                >
                  → {cell.winner}
                </div>
              ) : isDone ? (
                <div className="t-tiny c-3 truncate" style={{ marginBottom: 2 }}>
                  Settled
                </div>
              ) : null}

              {cell.amount ? (
                <div
                  className="t-mono"
                  style={{
                    fontSize: 10,
                    color: isActive ? 'var(--signal-300)' : 'var(--haze-3)',
                  }}
                >
                  {formatToken(cell.amount)}
                </div>
              ) : null}

              {!cell.winner && !cell.amount && !isDone ? (
                <div className="t-tiny" style={{ color: 'var(--haze-4)' }}>
                  {isActive ? 'In progress' : 'Upcoming'}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

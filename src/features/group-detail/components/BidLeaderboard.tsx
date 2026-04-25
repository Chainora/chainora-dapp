import { useMemo } from 'react';

import { formatToken } from '../utils';
import type { MemberPhaseView } from './MemberStatePanel';

type BidLeaderboardProps = {
  members: MemberPhaseView[];
  activePeriod: number;
  bidderCount: number;
  eligibleCount: number;
  payoutEstimateLabel: string;
  viewerAddress: string | null;
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

const barTrackStyle = {
  position: 'relative' as const,
  height: 18,
  background: 'var(--ink-1)',
  borderRadius: 'var(--r-pill)',
  overflow: 'hidden' as const,
};

export function BidLeaderboard({
  members,
  activePeriod,
  bidderCount,
  eligibleCount,
  payoutEstimateLabel,
  viewerAddress,
}: BidLeaderboardProps) {
  const viewerLower = viewerAddress?.toLowerCase() ?? '';

  const { topBids, totalDiscount } = useMemo(() => {
    const eligible = members.filter(member => {
      if (!member.bidAmountRaw) return false;
      try {
        return BigInt(member.bidAmountRaw) > 0n;
      } catch {
        return false;
      }
    });

    eligible.sort((a, b) => {
      try {
        const av = BigInt(a.bidAmountRaw ?? '0');
        const bv = BigInt(b.bidAmountRaw ?? '0');
        if (bv > av) return 1;
        if (bv < av) return -1;
      } catch {
        return 0;
      }
      return 0;
    });

    const sum = eligible.reduce((acc, member) => {
      try {
        return acc + BigInt(member.bidAmountRaw ?? '0');
      } catch {
        return acc;
      }
    }, 0n);

    return {
      topBids: eligible.slice(0, 5),
      totalDiscount: sum,
    };
  }, [members]);

  const maxValue = (() => {
    if (topBids.length === 0) return 1n;
    try {
      return BigInt(topBids[0].bidAmountRaw ?? '1');
    } catch {
      return 1n;
    }
  })();

  return (
    <section style={cardStyle}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 14 }}>
        <h3 className="c-1" style={titleStyle}>
          Bid leaderboard · period {activePeriod}
        </h3>
        <span className="t-tiny c-3">Public · realtime</span>
      </div>

      {topBids.length === 0 ? (
        <p
          className="t-small c-3"
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
          }}
        >
          No bids submitted yet for this period.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {topBids.map((member, index) => {
            const value = (() => {
              try {
                return BigInt(member.bidAmountRaw ?? '0');
              } catch {
                return 0n;
              }
            })();
            const pct = maxValue > 0n ? Number((value * 100n) / maxValue) : 0;
            const isTop = index === 0;
            const isViewer = Boolean(viewerLower) && member.address.toLowerCase() === viewerLower;

            return (
              <div
                key={member.address}
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: '120px 1fr 110px' }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ fontSize: 12, minWidth: 0 }}
                >
                  <span
                    className="t-mono"
                    style={{ color: 'var(--haze-4)', width: 16, flexShrink: 0 }}
                  >
                    #{index + 1}
                  </span>
                  <span
                    className="truncate"
                    title={member.displayLabel}
                    style={{
                      color: isViewer ? 'var(--signal-300)' : 'var(--haze-1)',
                      fontWeight: isViewer ? 600 : 400,
                    }}
                  >
                    {member.displayLabel}
                    {isViewer ? ' · you' : ''}
                  </span>
                </div>

                <div style={barTrackStyle}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${Math.max(2, Math.min(100, pct))}%`,
                      background: isTop
                        ? 'linear-gradient(90deg, var(--signal-500), var(--arc-400))'
                        : 'linear-gradient(90deg, var(--ink-5), var(--ink-6))',
                      boxShadow: isTop ? '0 0 16px -4px var(--signal-400)' : 'none',
                    }}
                  />
                </div>

                <div
                  className="t-mono"
                  style={{
                    fontSize: 12,
                    textAlign: 'right',
                    color: isTop ? 'var(--signal-300)' : 'var(--haze-2)',
                    fontWeight: isTop ? 600 : 400,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatToken(value.toString())}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="flex flex-wrap gap-4"
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--ink-5)',
          fontSize: 11,
          color: 'var(--haze-3)',
        }}
      >
        <span>
          Total bids:{' '}
          <b className="t-mono c-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatToken(totalDiscount.toString())}
          </b>
        </span>
        <span>
          {bidderCount} bidders / {eligibleCount} eligible
        </span>
        <span>
          Winner receives{' '}
          <b className="t-mono" style={{ color: 'var(--signal-300)', fontVariantNumeric: 'tabular-nums' }}>
            {payoutEstimateLabel}
          </b>
        </span>
      </div>
    </section>
  );
}

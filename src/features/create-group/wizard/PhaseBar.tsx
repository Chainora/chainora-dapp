import { formatDuration } from '../formSchema';

type PhaseBarProps = {
  contribSec: number;
  auctionSec: number;
  periodSec: number;
};

type Segment = {
  key: 'contrib' | 'auction' | 'payout';
  label: string;
  seconds: number;
  color: string;
  textColor: string;
};

const formatBrief = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe <= 0) {
    return '0';
  }
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${safe}s`;
};

export function PhaseBar({ contribSec, auctionSec, periodSec }: PhaseBarProps) {
  const safePeriod = Math.max(0, periodSec);
  const sumWindows = contribSec + auctionSec;
  const overflow = sumWindows > safePeriod;
  const payoutSec = overflow ? 0 : Math.max(0, safePeriod - sumWindows);

  const segments: Segment[] = [
    {
      key: 'contrib',
      label: 'Contribute',
      seconds: contribSec,
      color: 'var(--haze-4)',
      textColor: 'var(--ink-0)',
    },
    {
      key: 'auction',
      label: 'Auction',
      seconds: auctionSec,
      color: 'var(--signal-500)',
      textColor: '#fff',
    },
    {
      key: 'payout',
      label: 'Payout',
      seconds: payoutSec,
      color: 'var(--ok-500)',
      textColor: '#fff',
    },
  ];

  const denominator = segments.reduce((acc, seg) => acc + Math.max(0, seg.seconds), 0);
  const fallbackEqual = denominator <= 0;

  return (
    <div>
      <div
        className="flex h-9 w-full overflow-hidden"
        style={{
          borderRadius: 'var(--r-sm)',
          border: overflow ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--ink-5)',
        }}
      >
        {segments.map((segment, index) => {
          const seconds = Math.max(0, segment.seconds);
          const flex = fallbackEqual ? 1 : seconds <= 0 ? 0.0001 : seconds;
          return (
            <div
              key={segment.key}
              className="t-mono flex items-center justify-center font-semibold"
              style={{
                flex,
                background: segment.color,
                color: segment.textColor,
                fontSize: 11,
                borderRight:
                  index < segments.length - 1 ? '1px solid var(--ink-1)' : 'none',
              }}
              aria-label={`${segment.label}: ${formatDuration(seconds)}`}
            >
              {formatBrief(seconds)}
            </div>
          );
        })}
      </div>

      <div className="mt-[10px] flex flex-wrap gap-[18px]">
        {segments.map(segment => (
          <div key={`${segment.key}-legend`} className="flex items-center gap-[6px]">
            <span
              className="inline-block h-[10px] w-[10px]"
              style={{ background: segment.color, borderRadius: 2 }}
              aria-hidden="true"
            />
            <span className="t-tiny c-3">{segment.label}</span>
          </div>
        ))}
      </div>

      {overflow ? (
        <p className="t-tiny c-risk mt-2">
          Contribution + auction exceed the period length. Payout window must be greater than 0.
        </p>
      ) : null}
    </div>
  );
}

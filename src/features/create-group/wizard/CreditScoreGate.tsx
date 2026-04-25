import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type CreditScoreGateProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

type Tier = {
  label: string;
  color: string;
  bg: string;
};

const resolveTier = (score: number): Tier => {
  if (score <= 0) {
    return {
      label: 'Open · anyone joins',
      color: 'var(--haze-3)',
      bg: 'var(--ink-3)',
    };
  }
  if (score < 150) {
    return {
      label: 'Casual',
      color: 'var(--haze-2)',
      bg: 'var(--ink-3)',
    };
  }
  if (score < 300) {
    return {
      label: 'Steady',
      color: 'var(--arc-300)',
      bg: 'rgba(188,115,255,0.12)',
    };
  }
  if (score < 500) {
    return {
      label: 'Good',
      color: 'var(--signal-300)',
      bg: 'rgba(40,151,255,0.12)',
    };
  }
  if (score < 800) {
    return {
      label: 'Strong',
      color: 'var(--signal-300)',
      bg: 'rgba(40,151,255,0.12)',
    };
  }
  return {
    label: 'Excellent',
    color: 'var(--ok-300)',
    bg: 'rgba(16,185,129,0.12)',
  };
};

const TICKS = [0, 150, 300, 500, 800, 1000];

export function CreditScoreGate({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 50,
}: CreditScoreGateProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (raw: number): number => {
    if (!Number.isFinite(raw)) {
      return min;
    }
    return Math.max(min, Math.min(max, Math.round(raw)));
  };

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed));
    } else {
      setDraft(String(value));
    }
  };

  const stepBy = (delta: number) => {
    onChange(clamp(value + delta));
  };

  const handlePointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(clamp(min + ratio * (max - min)));
  };

  const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    handlePointer(event.clientX);
    const handleMove = (move: PointerEvent) => {
      handlePointer(move.clientX);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const tier = resolveTier(value);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      style={{
        background: 'var(--ink-1)',
        border: '1px solid var(--ink-5)',
        borderRadius: 'var(--r-md)',
        padding: '16px 18px',
      }}
    >
      <div className="mb-[18px] flex flex-wrap items-center gap-[14px]">
        <div
          className="flex items-center"
          style={{
            background: 'var(--ink-3)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => stepBy(-step)}
            disabled={value <= min}
            className="flex h-9 w-8 items-center justify-center text-lg leading-none c-3 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'transparent', border: 'none' }}
            aria-label="Decrease score"
          >
            −
          </button>
          <input
            type="number"
            min={min}
            max={max}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onBlur={event => commit(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            className="t-mono tabular-nums font-bold c-1 text-center"
            style={{
              width: 78,
              height: 36,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 22,
              padding: 0,
            }}
          />
          <button
            type="button"
            onClick={() => stepBy(step)}
            disabled={value >= max}
            className="flex h-9 w-8 items-center justify-center text-lg leading-none c-3 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'transparent', border: 'none' }}
            aria-label="Increase score"
          >
            +
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span
            className="t-tiny font-semibold"
            style={{
              alignSelf: 'flex-start',
              padding: '3px 10px',
              borderRadius: 'var(--r-pill)',
              background: tier.bg,
              color: tier.color,
              letterSpacing: '0.04em',
            }}
          >
            {tier.label}
          </span>
          <span className="t-tiny c-4">
            Members need ≥ <span className="t-mono c-2">{value}</span> reputation
          </span>
        </div>
      </div>

      <div className="relative pt-1">
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          className="relative cursor-pointer"
          style={{
            height: 6,
            background: 'var(--ink-4)',
            borderRadius: 'var(--r-pill)',
            overflow: 'hidden',
          }}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${pct}%`,
              height: '100%',
              background: `linear-gradient(90deg, var(--ink-5), ${tier.color})`,
            }}
          />
        </div>
        <div
          onPointerDown={onTrackPointerDown}
          style={{
            position: 'absolute',
            top: -1,
            left: `calc(${pct}% - 7px)`,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: tier.color,
            border: '2px solid var(--ink-1)',
            boxShadow: `0 0 10px ${tier.color}`,
            cursor: 'grab',
          }}
          aria-hidden="true"
        />

        <div className="mt-[10px] flex justify-between">
          {TICKS.map(tick => (
            <span key={tick} className="t-mono c-4" style={{ fontSize: 10 }}>
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export { resolveTier };

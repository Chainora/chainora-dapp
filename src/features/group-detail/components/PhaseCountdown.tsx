import { useEffect, useMemo, useRef, useState } from 'react';

import type { GroupPhaseStatus } from '../../../services/groupsService';
import { StatusBadge } from './StatusBadge';

const formatSeconds = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const remainingSeconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export function PhaseCountdown({
  phaseStatus,
  countdownSeconds,
  countdownLabel,
  variant = 'compact',
}: {
  phaseStatus: GroupPhaseStatus;
  countdownSeconds: number;
  countdownLabel: string;
  variant?: 'compact' | 'hero';
}) {
  const tone = useMemo(() => {
    switch (phaseStatus) {
      case 'active':
        return 'info' as const;
      case 'upcoming':
        return 'warning' as const;
      default:
        return 'muted' as const;
    }
  }, [phaseStatus]);

  const targetTimestampRef = useRef(Date.now() + Math.max(0, Math.floor(countdownSeconds)) * 1_000);
  const computeRemainingSeconds = (): number => {
    const deltaMs = targetTimestampRef.current - Date.now();
    if (deltaMs <= 0) {
      return 0;
    }
    return Math.ceil(deltaMs / 1_000);
  };
  const [remainingSeconds, setRemainingSeconds] = useState(() => computeRemainingSeconds());

  useEffect(() => {
    targetTimestampRef.current = Date.now() + Math.max(0, Math.floor(countdownSeconds)) * 1_000;
    setRemainingSeconds(computeRemainingSeconds());
  }, [countdownSeconds]);

  useEffect(() => {
    let timer: number | null = null;

    const updateRemaining = () => {
      const next = computeRemainingSeconds();
      setRemainingSeconds(current => (current === next ? current : next));
      if (next <= 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    updateRemaining();
    if (countdownSeconds > 0) {
      timer = window.setInterval(updateRemaining, 1_000);
    }

    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        updateRemaining();
      }
    };

    window.addEventListener('focus', onVisible);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
      window.removeEventListener('focus', onVisible);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [countdownSeconds]);

  if (variant === 'hero') {
    return (
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="font-mono text-3xl font-black leading-none tracking-tight text-slate-900 md:text-4xl">
          {formatSeconds(remainingSeconds)}
        </p>
        <div className="space-y-1 pb-0.5 text-right">
          <StatusBadge label={countdownLabel || 'N/A'} tone={tone} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {remainingSeconds > 0 ? 'remaining' : 'time up'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <StatusBadge label={countdownLabel || 'N/A'} tone={tone} />
      {remainingSeconds > 0 ? (
        <span className="text-xs font-medium text-slate-500">{formatSeconds(remainingSeconds)} remaining</span>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

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
}: {
  phaseStatus: GroupPhaseStatus;
  countdownSeconds: number;
  countdownLabel: string;
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

  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, Math.floor(countdownSeconds)));

  useEffect(() => {
    setRemainingSeconds(Math.max(0, Math.floor(countdownSeconds)));
  }, [countdownSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds(current => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [remainingSeconds]);

  return (
    <div className="inline-flex items-center gap-2">
      <StatusBadge label={countdownLabel || 'N/A'} tone={tone} />
      {remainingSeconds > 0 ? (
        <span className="text-xs font-medium text-slate-500">{formatSeconds(remainingSeconds)} remaining</span>
      ) : null}
    </div>
  );
}

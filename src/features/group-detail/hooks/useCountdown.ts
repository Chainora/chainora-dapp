import { useEffect, useState } from 'react';

const SECONDS_PER_DAY = 86400;

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const formatRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Ended';
  if (seconds >= SECONDS_PER_DAY) {
    const days = Math.floor(seconds / SECONDS_PER_DAY);
    return `${days}d`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
};

export type CountdownView = {
  label: string;
  remainingSeconds: number;
  isLiveTicking: boolean;
};

export function useCountdown(deadlineEpochSeconds: number | null | undefined): CountdownView {
  const computeRemaining = (): number => {
    if (!deadlineEpochSeconds || deadlineEpochSeconds <= 0) return 0;
    const nowMs = Date.now();
    return Math.max(0, Math.floor(deadlineEpochSeconds - nowMs / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(computeRemaining);

  useEffect(() => {
    setRemainingSeconds(computeRemaining());

    if (!deadlineEpochSeconds || deadlineEpochSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(computeRemaining());
    }, 1000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineEpochSeconds]);

  return {
    label: deadlineEpochSeconds && deadlineEpochSeconds > 0 ? formatRemaining(remainingSeconds) : '—',
    remainingSeconds,
    isLiveTicking: remainingSeconds > 0 && remainingSeconds < SECONDS_PER_DAY,
  };
}

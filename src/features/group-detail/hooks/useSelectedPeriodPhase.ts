import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GroupPhase } from '../../../services/groupsService';

type UseSelectedPeriodPhaseParams = {
  totalPeriods: number;
  activePeriod: number;
  activePhase: GroupPhase;
  preferredPhase?: GroupPhase;
};

type UseSelectedPeriodPhaseResult = {
  selectedPeriod: number;
  selectedPhase: GroupPhase;
  setSelectedPeriod: (period: number) => void;
  setSelectedPhase: (phase: GroupPhase) => void;
  resetToActive: () => void;
};

const clampPeriod = (period: number, totalPeriods: number): number => {
  if (!Number.isFinite(period)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(period), 1), Math.max(totalPeriods, 1));
};

const fallbackPhaseForPeriod = (
  period: number,
  activePeriod: number,
  activePhase: GroupPhase,
): GroupPhase => {
  if (period < activePeriod) {
    return 'ending';
  }
  if (period > activePeriod) {
    return 'funding';
  }
  return activePhase;
};

export const useSelectedPeriodPhase = ({
  totalPeriods,
  activePeriod,
  activePhase,
  preferredPhase,
}: UseSelectedPeriodPhaseParams): UseSelectedPeriodPhaseResult => {
  const initializedRef = useRef(false);
  const [selectedPeriod, setSelectedPeriodState] = useState(() => clampPeriod(activePeriod, totalPeriods));
  const [selectedPhase, setSelectedPhaseState] = useState<GroupPhase>(() => preferredPhase ?? activePhase);

  useEffect(() => {
    const nextActivePeriod = clampPeriod(activePeriod, totalPeriods);
    if (!initializedRef.current) {
      setSelectedPeriodState(nextActivePeriod);
      setSelectedPhaseState(preferredPhase ?? activePhase);
      initializedRef.current = true;
      return;
    }

    setSelectedPeriodState(current => clampPeriod(current, totalPeriods));
  }, [activePeriod, activePhase, preferredPhase, totalPeriods]);

  const setSelectedPeriod = useCallback((period: number) => {
    const clamped = clampPeriod(period, totalPeriods);
    setSelectedPeriodState(clamped);
    setSelectedPhaseState(fallbackPhaseForPeriod(clamped, activePeriod, activePhase));
  }, [activePeriod, activePhase, totalPeriods]);

  const setSelectedPhase = useCallback((phase: GroupPhase) => {
    setSelectedPhaseState(phase);
  }, []);

  const resetToActive = useCallback(() => {
    const normalizedActive = clampPeriod(activePeriod, totalPeriods);
    setSelectedPeriodState(normalizedActive);
    setSelectedPhaseState(activePhase);
  }, [activePeriod, activePhase, totalPeriods]);

  return useMemo(() => ({
    selectedPeriod,
    selectedPhase,
    setSelectedPeriod,
    setSelectedPhase,
    resetToActive,
  }), [resetToActive, selectedPeriod, selectedPhase, setSelectedPeriod, setSelectedPhase]);
};

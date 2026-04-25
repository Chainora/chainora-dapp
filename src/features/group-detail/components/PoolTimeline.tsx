import { Fragment } from 'react';

import type { GroupStatus } from '../../../services/groupStatus';
import { compactPhaseLabel, type CompactUiPhase } from '../compactConfig';

type PillState = 'done' | 'active' | 'pending';

type Stage = {
  key: 'contribute' | 'lock' | 'auction' | 'award' | 'settle';
  label: string;
};

const STAGES: Stage[] = [
  { key: 'contribute', label: 'Contribute' },
  { key: 'lock', label: 'Lock' },
  { key: 'auction', label: 'Auction' },
  { key: 'award', label: 'Award' },
  { key: 'settle', label: 'Settle' },
];

const phaseToActiveIndex = (phase: CompactUiPhase): number => {
  switch (phase) {
    case 'funding':
      return 0;
    case 'bidding':
      return 2;
    case 'payout':
      return 3;
    case 'ending':
      return 4;
    case 'forming':
    default:
      return -1;
  }
};

const resolveStageState = (
  stageIndex: number,
  activeIndex: number,
  groupStatus: GroupStatus,
): PillState => {
  if (groupStatus === 'archived') {
    return 'done';
  }
  if (activeIndex < 0) {
    return 'pending';
  }
  if (stageIndex < activeIndex) {
    return 'done';
  }
  if (stageIndex === activeIndex) {
    return 'active';
  }
  // Lock has no separate phase: when bidding active (idx 2), Lock (idx 1) is implicitly done.
  if (stageIndex === 1 && activeIndex >= 2) {
    return 'done';
  }
  return 'pending';
};

export function PoolTimeline({
  activePhase,
  groupStatus,
  activePeriod,
}: {
  activePhase: CompactUiPhase;
  groupStatus: GroupStatus;
  activePeriod: number;
}) {
  const activeIndex = phaseToActiveIndex(activePhase);
  const showFormingNotice = activePhase === 'forming' && groupStatus !== 'archived';

  return (
    <section className="card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-label">Lifecycle Timeline</h2>
        <span className="chip chip-signal">
          Period {Math.max(activePeriod, 1)} · {compactPhaseLabel(activePhase)}
        </span>
      </div>

      {showFormingNotice ? (
        <p className="t-small c-2 mt-3">
          Group is forming. Lifecycle starts when the first period opens.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {STAGES.map((stage, index) => {
            const state = resolveStageState(index, activeIndex, groupStatus);
            return (
              <Fragment key={stage.key}>
                <span className={`pill ${state}`}>
                  <span className="tick" aria-hidden="true">
                    {state === 'done' ? '✓' : ''}
                  </span>
                  {stage.label}
                </span>
                {index < STAGES.length - 1 ? <span className="link-connector" aria-hidden="true" /> : null}
              </Fragment>
            );
          })}
        </div>
      )}

      {groupStatus === 'voting_extension' ? (
        <p className="t-tiny c-warn mt-3">Extension voting is open for the current cycle.</p>
      ) : null}
    </section>
  );
}

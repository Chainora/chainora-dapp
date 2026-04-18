import type { GroupStatus } from '../../../services/groupStatus';
import { compactPhaseLabel, type CompactUiPhase } from '../compactConfig';
import { StatusBadge } from './StatusBadge';

const timelineSteps: CompactUiPhase[] = ['forming', 'funding', 'bidding', 'payout', 'ending'];

const resolveStepState = (
  step: CompactUiPhase,
  activePhase: CompactUiPhase,
  groupStatus: GroupStatus,
): 'completed' | 'active' | 'locked' => {
  if (groupStatus === 'archived') {
    return 'completed';
  }

  if (groupStatus === 'forming') {
    return step === 'forming' ? 'active' : 'locked';
  }

  const activeIndex = timelineSteps.indexOf(activePhase);
  const stepIndex = timelineSteps.indexOf(step);
  if (stepIndex < activeIndex) {
    return 'completed';
  }
  if (stepIndex === activeIndex) {
    return 'active';
  }
  return 'locked';
};

const stepTone = (state: 'completed' | 'active' | 'locked'): 'success' | 'info' | 'muted' => {
  switch (state) {
    case 'completed':
      return 'success';
    case 'active':
      return 'info';
    default:
      return 'muted';
  }
};

export function PoolTimeline({
  activePhase,
  groupStatus,
}: {
  activePhase: CompactUiPhase;
  groupStatus: GroupStatus;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Lifecycle Timeline</h2>
        <StatusBadge label={compactPhaseLabel(activePhase)} tone="info" />
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2">
        {timelineSteps.map(step => {
          const state = resolveStepState(step, activePhase, groupStatus);
          const isActive = state === 'active';
          return (
            <div
              key={step}
              className={`rounded-xl border px-2 py-2 text-center ${
                isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="text-xs font-semibold text-slate-700">{compactPhaseLabel(step)}</p>
              <div className="mt-1 flex justify-center">
                <StatusBadge label={state} tone={stepTone(state)} />
              </div>
            </div>
          );
        })}
      </div>

      {groupStatus === 'voting_extension' ? (
        <p className="mt-2 text-xs text-amber-700">Extension voting is open for the current cycle.</p>
      ) : null}
    </section>
  );
}

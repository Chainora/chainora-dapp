import type { GroupPhase } from '../../../services/groupsService';
import { phaseLabel } from '../model';
import { StatusBadge } from './StatusBadge';

type PhaseItem = {
  phase: GroupPhase;
  state: 'completed' | 'active' | 'locked';
};

const toneByState = (state: PhaseItem['state']) => {
  switch (state) {
    case 'completed':
      return 'success' as const;
    case 'active':
      return 'info' as const;
    default:
      return 'muted' as const;
  }
};

export function PhaseSelector({
  phases,
  selectedPhase,
  onSelect,
}: {
  phases: PhaseItem[];
  selectedPhase: GroupPhase;
  onSelect: (phase: GroupPhase) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Phase Selector</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map(item => (
          <button
            key={item.phase}
            type="button"
            onClick={() => onSelect(item.phase)}
            className={`rounded-lg border px-3 py-3 text-left transition ${
              item.phase === selectedPhase
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{phaseLabel(item.phase)}</p>
            <div className="mt-2">
              <StatusBadge label={item.state} tone={toneByState(item.state)} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

import { StatusBadge } from './StatusBadge';

type PeriodOption = {
  period: number;
  state: 'completed' | 'active' | 'upcoming';
};

const periodTone = (state: PeriodOption['state']) => {
  switch (state) {
    case 'completed':
      return 'success' as const;
    case 'active':
      return 'info' as const;
    default:
      return 'muted' as const;
  }
};

const periodLabel = (state: PeriodOption['state']) => {
  switch (state) {
    case 'completed':
      return 'Completed';
    case 'active':
      return 'Active';
    default:
      return 'Upcoming';
  }
};

export function PeriodSelector({
  periods,
  selectedPeriod,
  onSelect,
}: {
  periods: PeriodOption[];
  selectedPeriod: number;
  onSelect: (period: number) => void;
}) {
  const selected = periods.find(item => item.period === selectedPeriod);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Period Selector</h2>
        {selected ? <StatusBadge label={periodLabel(selected.state)} tone={periodTone(selected.state)} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {periods.map(item => (
          <button
            key={`period-${item.period}`}
            type="button"
            onClick={() => onSelect(item.period)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              item.period === selectedPeriod
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Period {item.period}
          </button>
        ))}
      </div>
    </section>
  );
}

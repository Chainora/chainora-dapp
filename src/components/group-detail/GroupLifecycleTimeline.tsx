import type { PoolLifecycleSummary } from '../../services/groupLifecycle';

type GroupLifecycleTimelineProps = {
  lifecycle: PoolLifecycleSummary;
};

export function GroupLifecycleTimeline({ lifecycle }: GroupLifecycleTimelineProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">Pool Timeline</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {lifecycle.label}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {lifecycle.steps.map((step, index) => {
          const isActive = index === lifecycle.stepIndex;
          const isCompleted = index < lifecycle.stepIndex;
          return (
            <div
              key={step.key}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                isActive
                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                  : isCompleted
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.08em]">
                Step {index + 1}
              </span>
              <span className="mt-1 block">{step.label}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

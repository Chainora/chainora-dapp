type StepDef = {
  n: string;
  label: string;
  sub: string;
};

export const WIZARD_STEPS: readonly StepDef[] = [
  { n: '01', label: 'Basics', sub: 'Name, description, members' },
  { n: '02', label: 'Cadence & cycles', sub: 'Period, contribution, auction' },
  { n: '03', label: 'Finance', sub: 'Amount, reputation gate' },
  { n: '04', label: 'Review', sub: 'Sign & deploy' },
] as const;

const activeCardStyle = {
  background: 'linear-gradient(180deg, rgba(40,151,255,0.12), var(--ink-2))',
  border: '1px solid rgba(40,151,255,0.4)',
  borderRadius: 'var(--r-lg)',
} as const;

const idleCardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
} as const;

const doneCircleStyle = {
  background: 'var(--ok-500)',
  color: '#061a10',
} as const;

const activeCircleStyle = {
  background: 'var(--signal-500)',
  color: '#fff',
} as const;

const pendingCircleStyle = {
  background: 'var(--ink-4)',
  color: 'var(--haze-4)',
} as const;

export function Stepper({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {WIZARD_STEPS.map((step, index) => {
        const state = index < active ? 'done' : index === active ? 'active' : 'pending';
        const cardStyle = state === 'active' ? activeCardStyle : idleCardStyle;
        const circleStyle =
          state === 'done'
            ? doneCircleStyle
            : state === 'active'
              ? activeCircleStyle
              : pendingCircleStyle;
        const circleBody = state === 'done' ? '✓' : step.n.slice(1);
        const labelColor = state === 'pending' ? 'var(--haze-4)' : 'var(--haze-1)';

        return (
          <div key={step.n} className="relative px-4 py-[14px]" style={cardStyle}>
            <div className="mb-1 flex items-center gap-[10px]">
              <span
                className="inline-flex h-[22px] w-[22px] items-center justify-center font-bold"
                style={{
                  ...circleStyle,
                  borderRadius: '50%',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {circleBody}
              </span>
              <span className="t-small font-semibold" style={{ color: labelColor }}>
                {step.label}
              </span>
            </div>
            <p className="t-tiny c-3 pl-8">{step.sub}</p>
            {index < WIZARD_STEPS.length - 1 ? (
              <span
                className="absolute hidden md:block"
                style={{
                  right: -6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-6)',
                }}
                aria-hidden="true"
              >
                ›
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

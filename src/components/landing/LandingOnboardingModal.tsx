import { useMemo, useState } from 'react';

import { Button } from '../ui/Button';

type LandingOnboardingModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

type StepDefinition = {
  title: string;
  subtitle: string;
  description?: string;
  bullets?: string[];
};

const STEPS: StepDefinition[] = [
  {
    title: 'Welcome to ICRosca',
    subtitle: 'Simple, transparent ROSCA groups on-chain.',
    description:
      'Use hardware-backed signing and clear contribution rules to run trusted rotating savings groups with less friction.',
  },
  {
    title: 'How It Works',
    subtitle: 'Start in a few guided steps.',
    bullets: [
      'Create or join a ROSCA circle.',
      'Contribute tCNR on each round.',
      'Track members and payout order transparently.',
      'Confirm actions with your secure card signing flow.',
    ],
  },
  {
    title: 'Security First',
    subtitle: 'Built around signature verification.',
    description:
      'Authentication and sensitive actions are validated through signed payloads, helping protect your account and group funds.',
  },
  {
    title: 'Ready to Start',
    subtitle: 'Review and continue.',
    description:
      'By continuing, you acknowledge that this is an early product and should be used responsibly while features are being improved.',
  },
];

export function LandingOnboardingModal({ open, onClose, onComplete }: LandingOnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const terms = useMemo(
    () => [
      'ICRosca is not financial advice.',
      'Always verify contribution amount before signing.',
      'Never share private keys or recovery phrases.',
      'Use trusted wallets and secure devices only.',
      'Network and gas conditions may impact transaction timing.',
      'Early-stage features may change over time.',
    ],
    [],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${index <= step ? 'bg-sky-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-600">Onboarding</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{current.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{current.subtitle}</p>

          {current.description ? <p className="mt-4 text-sm leading-relaxed text-slate-700">{current.description}</p> : null}

          {current.bullets ? (
            <div className="mt-4 space-y-2.5">
              {current.bullets.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {isLast ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTerms(prev => !prev)}
                  className="text-sm font-medium text-sky-700"
                >
                  {showTerms ? 'Hide Terms' : 'View Terms'}
                </button>
                {showTerms ? (
                  <div className="mt-3 max-h-32 space-y-1.5 overflow-y-auto text-xs text-slate-500">
                    {terms.map(item => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  checked={agreed}
                  onChange={event => setAgreed(event.target.checked)}
                />
                I understand and agree to continue with ICRosca onboarding terms.
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 0}
            className="rounded-lg"
          >
            Previous
          </Button>

          <span className="text-xs text-slate-500">
            {step + 1} / {STEPS.length}
          </span>

          {isLast ? (
            <Button
              type="button"
              onClick={() => {
                onComplete();
                onClose();
                setStep(0);
                setAgreed(false);
                setShowTerms(false);
              }}
              disabled={!agreed}
              className="rounded-lg"
            >
              Start
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep(prev => prev + 1)} className="rounded-lg">
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

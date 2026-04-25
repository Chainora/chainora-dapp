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
    title: 'Welcome to Chainora',
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
      'Chainora is not financial advice.',
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
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(5,7,13,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          background: 'var(--ink-2)',
          border: '1px solid var(--ink-6)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg), 0 0 60px -10px rgba(40,151,255,0.3)',
        }}
      >
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: index <= step ? 'var(--signal-500)' : 'var(--ink-4)',
              }}
            />
          ))}
        </div>

        <div className="p-6">
          <p className="t-label" style={{ color: 'var(--signal-300)' }}>
            Onboarding
          </p>
          <h2 className="t-h3 c-1 mt-2">{current.title}</h2>
          <p className="t-small c-3 mt-1">{current.subtitle}</p>

          {current.description ? (
            <p className="t-body c-2 mt-4 leading-relaxed">{current.description}</p>
          ) : null}

          {current.bullets ? (
            <div className="mt-4 space-y-3">
              {current.bullets.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--signal-500)', color: 'white' }}
                  >
                    {index + 1}
                  </div>
                  <span className="t-small c-2">{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {isLast ? (
            <div className="mt-5 space-y-3">
              <div
                className="rounded-[var(--r-md)] p-3"
                style={{ background: 'var(--ink-1)', border: '1px solid var(--ink-5)' }}
              >
                <button
                  type="button"
                  onClick={() => setShowTerms(prev => !prev)}
                  className="t-small font-medium"
                  style={{ color: 'var(--signal-300)' }}
                >
                  {showTerms ? 'Hide Terms' : 'View Terms'}
                </button>
                {showTerms ? (
                  <div className="t-tiny c-3 mt-3 max-h-32 space-y-1.5 overflow-y-auto">
                    {terms.map(item => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2 t-small c-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded"
                  style={{ accentColor: 'var(--signal-500)' }}
                  checked={agreed}
                  onChange={event => setAgreed(event.target.checked)}
                />
                I understand and agree to continue with Chainora onboarding terms.
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 0}
          >
            Previous
          </Button>

          <span className="t-tiny c-3">
            {step + 1} / {STEPS.length}
          </span>

          {isLast ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onComplete();
                onClose();
                setStep(0);
                setAgreed(false);
                setShowTerms(false);
              }}
              disabled={!agreed}
            >
              Start
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setStep(prev => prev + 1)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

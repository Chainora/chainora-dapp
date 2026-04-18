import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { LandingOnboardingModal } from '../components/landing/LandingOnboardingModal';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const LOGO_URL = 'https://media.base44.com/images/public/69d29468e773ef42abd4ce42/e1097b18b_logo2.png';

const STATS = [
  { value: '100%', label: 'Transparent rounds' },
  { value: 'tCNR', label: 'Contribution asset' },
  { value: 'Card Sign', label: 'Hardware-backed actions' },
];

const FEATURES = [
  {
    title: 'Secure by Design',
    description: 'Signature-based flows and clear action states keep critical operations verifiable and auditable.',
  },
  {
    title: 'Community Coordination',
    description: 'Run ROSCA groups with simple participation, round visibility, and predictable member expectations.',
  },
  {
    title: 'Fast User Journey',
    description: 'From onboarding to contribution, the interface is designed to reduce friction for daily group usage.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void navigate({ to: '/dashboard' });
  }, [isAuthenticated, navigate]);

  return (
    <div className="mx-auto max-w-6xl">
      <section className="landing-hero rounded-3xl px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 flex justify-center">
            <img src={LOGO_URL} alt="ICRosca" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/70" />
          </div>

          <h1 className="text-4xl font-bold leading-tight text-blue-950 sm:text-5xl">
            ICRosca
            <br />
            <span className="text-blue-600">Simple ROSCA on-chain</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-900/75">
            Coordinate contribution circles with secure signing, clear rounds, and a practical interface for real group workflows.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 text-base text-white hover:from-blue-500 hover:to-sky-400"
              onClick={() => {
                setShowOnboarding(true);
              }}
            >
              Get Started
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-xl border-blue-200 px-8 text-base text-blue-700"
              onClick={() => {
                void navigate({ to: '/dashboard' });
              }}
            >
              Open Dashboard
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 rounded-2xl border border-blue-100 bg-white p-6 sm:grid-cols-3">
        {STATS.map(item => (
          <div key={item.label} className="text-center">
            <p className="text-2xl font-bold text-blue-700">{item.value}</p>
            <p className="mt-1 text-sm text-blue-900/60">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-blue-950">Why Teams Choose ICRosca</h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-900/70">
            Built for reliability and ease of use, while keeping blockchain actions understandable for everyday users.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <article key={feature.title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-blue-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-blue-900/70">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl bg-gradient-to-r from-blue-700 to-sky-600 px-8 py-12 text-center">
        <h2 className="text-3xl font-bold text-white">Ready to launch your ROSCA flow?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-blue-100">
          Start with onboarding, connect your wallet, and manage contribution rounds with better transparency.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-7 h-12 rounded-xl px-8 text-base"
          onClick={() => {
            setShowOnboarding(true);
          }}
        >
          Start with Onboarding
        </Button>
      </section>

      <LandingOnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          void navigate({ to: '/dashboard' });
        }}
      />
    </div>
  );
}

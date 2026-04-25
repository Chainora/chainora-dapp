import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { LandingFeatureCard } from "../components/landing/LandingFeatureCard";
import { LandingOnboardingModal } from "../components/landing/LandingOnboardingModal";
import { LandingTrustStats } from "../components/landing/LandingTrustStats";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const STATS = [
  { value: "100%", label: "Transparent rounds" },
  { value: "tCNR", label: "Contribution asset" },
  { value: "Card Sign", label: "Hardware-backed actions" },
];

const FEATURES = [
  {
    title: "Secure by Design",
    description:
      "Signature-based flows and clear action states keep critical operations verifiable and auditable.",
  },
  {
    title: "Community Coordination",
    description:
      "Run ROSCA groups with simple participation, round visibility, and predictable member expectations.",
  },
  {
    title: "Fast User Journey",
    description:
      "From onboarding to contribution, the interface is designed to reduce friction for daily group usage.",
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

    void navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pb-20">
      <section className="aurora grid-lines relative overflow-hidden rounded-[var(--r-2xl)] px-6 py-20 sm:px-10 sm:py-28">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="t-display">
            Chainora
            <br />
            <em>Rosca</em>
          </h1>
          <p className="t-body c-2 mx-auto mt-6 max-w-[64ch]">
            Coordinate contribution circles with secure signing, clear rounds,
            and a practical interface for real group workflows.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setShowOnboarding(true);
              }}
            >
              Get Started
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                void navigate({ to: "/dashboard" });
              }}
            >
              Open Dashboard
            </Button>
          </div>
        </div>
      </section>

      <LandingTrustStats items={STATS} />

      <section className="mt-20">
        <div className="mb-10 text-center">
          <h2 className="t-h2 c-1">Why Teams Choose Chainora</h2>
          <p className="t-body c-2 mx-auto mt-3 max-w-2xl">
            Built for reliability and ease of use, while keeping blockchain
            actions understandable for everyday users.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <LandingFeatureCard
              key={feature.title}
              index={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>

      <section
        className="aurora relative mt-20 overflow-hidden rounded-[var(--r-2xl)] px-8 py-14 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--ink-2) 0%, var(--ink-3) 100%)",
          border: "1px solid var(--ink-5)",
        }}
      >
        <div className="relative z-10">
          <h2 className="t-h2 c-1">Ready to launch your ROSCA flow?</h2>
          <p className="t-body c-2 mx-auto mt-3 max-w-2xl">
            Start with onboarding, connect your wallet, and manage contribution
            rounds with better transparency.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="mt-8"
            onClick={() => {
              setShowOnboarding(true);
            }}
          >
            Start with Onboarding
          </Button>
        </div>
      </section>

      <LandingOnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          void navigate({ to: "/dashboard" });
        }}
      />
    </div>
  );
}

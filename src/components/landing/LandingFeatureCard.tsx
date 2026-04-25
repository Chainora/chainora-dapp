import type { ReactNode } from 'react';

type LandingFeatureCardProps = {
  index: number;
  title: string;
  description: string;
  icon?: ReactNode;
};

export function LandingFeatureCard({ index, title, description, icon }: LandingFeatureCardProps) {
  return (
    <article className="card-raised relative flex flex-col p-6">
      <div
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] text-sm font-semibold"
        style={{
          background: 'rgba(40,151,255,0.12)',
          color: 'var(--signal-300)',
          border: '1px solid rgba(40,151,255,0.4)',
        }}
      >
        {icon ?? String(index + 1).padStart(2, '0')}
      </div>
      <h3 className="t-h4 c-1">{title}</h3>
      <p className="t-body c-2 mt-2">{description}</p>
    </article>
  );
}

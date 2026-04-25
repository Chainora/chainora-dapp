import type { PropsWithChildren } from 'react';

type SectionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="card-raised p-6">
      <h2 className="t-h3 c-1" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {subtitle ? <p className="t-small c-3 mt-1">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

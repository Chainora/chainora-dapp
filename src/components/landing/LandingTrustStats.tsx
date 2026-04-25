type StatItem = {
  value: string;
  label: string;
};

type LandingTrustStatsProps = {
  items: StatItem[];
};

export function LandingTrustStats({ items }: LandingTrustStatsProps) {
  return (
    <section
      className="mt-16 grid grid-cols-2 gap-6 pt-8 sm:grid-cols-3"
      style={{ borderTop: '1px solid var(--ink-5)' }}
    >
      {items.map(item => (
        <div key={item.label} className="text-center sm:text-left">
          <p
            className="t-num text-3xl font-bold c-1"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            {item.value}
          </p>
          <p className="t-label mt-2">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

type LoadingCardProps = {
  count?: number;
  rows?: number;
  className?: string;
};

export function LoadingCard({ count = 1, rows = 3, className = '' }: LoadingCardProps) {
  const cards = Array.from({ length: count });
  return (
    <>
      {cards.map((_, cardIndex) => (
        <article key={cardIndex} className={`card p-4 ${className}`.trim()}>
          <div className="skeleton mb-3 h-32 w-full" style={{ borderRadius: 'var(--r-md)' }} />
          <div className="skeleton mb-2 h-5 w-2/3" />
          <div className="skeleton mb-3 h-3 w-full" />
          <div className="space-y-2">
            {Array.from({ length: rows }).map((__, rowIndex) => (
              <div key={rowIndex} className="skeleton h-3 w-full" />
            ))}
          </div>
          <div className="skeleton mt-4 h-2 w-full" style={{ borderRadius: 'var(--r-pill)' }} />
        </article>
      ))}
    </>
  );
}

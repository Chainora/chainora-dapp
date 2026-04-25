export function DetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-4 px-6 py-6">
      <div className="skeleton h-10 w-36" />
      <div className="skeleton h-72 w-full" style={{ borderRadius: 'var(--r-2xl)' }} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-72 w-full" style={{ borderRadius: 'var(--r-xl)' }} />
        <div className="skeleton h-72 w-full" style={{ borderRadius: 'var(--r-xl)' }} />
      </div>
      <div className="skeleton h-64 w-full" style={{ borderRadius: 'var(--r-xl)' }} />
    </section>
  );
}

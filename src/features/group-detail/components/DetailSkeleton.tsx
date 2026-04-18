export function DetailSkeleton() {
  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-72 animate-pulse rounded-3xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
    </section>
  );
}

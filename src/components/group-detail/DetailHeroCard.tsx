import { Glyph } from './Glyph';

type DetailHeroCardProps = {
  name: string;
  description: string;
  statusLabel: string;
  statusClassName: string;
  isPublic: boolean;
  isListed: boolean | null;
  groupImageUrl?: string;
  poolAddress: string;
  contributionLabel: string;
  totalPayoutLabel: string;
  membersLabel: string;
  roundLabel: string;
};

export function DetailHeroCard({
  name,
  description,
  statusLabel,
  statusClassName,
  isPublic,
  isListed,
  groupImageUrl,
  poolAddress,
  contributionLabel,
  totalPayoutLabel,
  membersLabel,
  roundLabel,
}: DetailHeroCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{name}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-base text-slate-600">{description || 'No description provided yet.'}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700">
              <Glyph name="auction" className="h-3.5 w-3.5" />
              Auction group
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
              {isPublic ? 'Public' : 'Private'}
            </span>
            {isListed !== null ? (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
                {isListed ? 'Listed in discovery' : 'Not listed'}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-56 flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
          {groupImageUrl ? (
            <img
              src={groupImageUrl}
              alt={`${name} cover`}
              loading="eager"
              className="h-44 w-full rounded-xl object-cover object-center ring-1 ring-slate-200 shadow-sm sm:h-52"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center rounded-xl bg-slate-200/80 text-sm font-semibold text-slate-500 sm:h-52">
              Group cover
            </div>
          )}
          <div className="mt-3 rounded-xl bg-slate-100/80 px-3 py-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Glyph name="shield" className="h-3.5 w-3.5" />
              Contract
            </span>{' '}
            <span className="font-mono">{poolAddress}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Glyph name="coin" className="h-3.5 w-3.5" />
            Per period
          </p>
          <p className="mt-1 text-xl font-black text-blue-600">{contributionLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Glyph name="spark" className="h-3.5 w-3.5" />
            Total payout
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">{totalPayoutLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Glyph name="members" className="h-3.5 w-3.5" />
            Members
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">{membersLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Glyph name="clock" className="h-3.5 w-3.5" />
            Current round
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">{roundLabel}</p>
        </div>
      </div>
    </article>
  );
}


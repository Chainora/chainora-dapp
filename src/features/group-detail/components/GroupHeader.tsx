import { Glyph } from '../../../components/group-detail/Glyph';

type GroupHeaderProps = {
  name: string;
  description: string;
  statusLabel: string;
  statusClassName: string;
  poolAddress: string;
  isPublic: boolean;
  isListed: boolean | null;
  groupImageUrl?: string;
};

export function GroupHeader({
  name,
  description,
  statusLabel,
  statusClassName,
  poolAddress,
  isPublic,
  isListed,
  groupImageUrl,
}: GroupHeaderProps) {
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
    </article>
  );
}

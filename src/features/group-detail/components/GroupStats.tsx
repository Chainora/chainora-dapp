import { Glyph } from '../../../components/group-detail/Glyph';

type GroupStatsProps = {
  contributionLabel: string;
  totalPayoutLabel: string;
  membersLabel: string;
  roundLabel: string;
};

export function GroupStats({ contributionLabel, totalPayoutLabel, membersLabel, roundLabel }: GroupStatsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    </section>
  );
}

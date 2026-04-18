import { Glyph } from '../../../components/group-detail/Glyph';

export function DetailTopBar({
  isRefreshing,
  onBack,
  onRefresh,
}: {
  isRefreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Glyph name="back" className="h-4 w-4" />
        Back to dashboard
      </button>
      <div className="flex items-center gap-2">
        {isRefreshing ? <span className="text-[11px] text-slate-500">Syncing on-chain data...</span> : null}
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Glyph name="refresh" className="h-4 w-4" />
          Refresh now
        </button>
      </div>
    </div>
  );
}

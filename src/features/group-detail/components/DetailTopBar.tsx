import { Button } from '../../../components/ui/Button';
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
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <Glyph name="back" className="h-4 w-4" />
        Back to dashboard
      </Button>
      <div className="flex items-center gap-3">
        {isRefreshing ? <span className="t-tiny c-3">Syncing on-chain data...</span> : null}
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
          <Glyph name="refresh" className="h-4 w-4" />
          Refresh now
        </Button>
      </div>
    </div>
  );
}

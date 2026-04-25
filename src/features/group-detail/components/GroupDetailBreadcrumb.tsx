import { Button } from '../../../components/ui/Button';

type GroupDetailBreadcrumbProps = {
  groupName: string;
  currentCycle: number;
  isRefreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

const separatorStyle = { color: 'var(--ink-6)' } as const;
const trailingStyle = {
  color: 'var(--haze-1)',
  maxWidth: '38ch',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
} as const;

const dashboardLinkStyle = {
  color: 'var(--haze-3)',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  padding: 0,
  font: 'inherit',
} as const;

const spinnerStyle = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: '2px solid rgba(40,151,255,0.2)',
  borderTopColor: 'var(--signal-300)',
  animation: 'chainora-spin 0.8s linear infinite',
  display: 'inline-block',
} as const;

function RefreshIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 6A5 5 0 1 0 12 12.5M13 3v3h-3" />
    </svg>
  );
}

export function GroupDetailBreadcrumb({
  groupName,
  currentCycle,
  isRefreshing,
  onBack,
  onRefresh,
}: GroupDetailBreadcrumbProps) {
  return (
    <>
      <style>{`@keyframes chainora-spin { to { transform: rotate(360deg); } }`}</style>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center justify-between gap-3"
      >
        <ol className="flex items-center gap-2" style={{ fontSize: 12 }}>
          <li>
            <button
              type="button"
              onClick={onBack}
              style={dashboardLinkStyle}
              className="hover:underline"
            >
              Dashboard
            </button>
          </li>
          <li aria-hidden="true" style={separatorStyle}>
            /
          </li>
          <li style={{ color: 'var(--haze-3)' }}>Groups</li>
          <li aria-hidden="true" style={separatorStyle}>
            /
          </li>
          <li style={trailingStyle} title={`${groupName} · Cycle ${currentCycle}`}>
            {groupName} · Cycle {currentCycle}
          </li>
        </ol>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
          title="Refresh"
        >
          <span className="inline-flex items-center gap-2">
            {isRefreshing ? <span style={spinnerStyle} aria-hidden="true" /> : <RefreshIcon />}
            Refresh
          </span>
        </Button>
      </nav>
    </>
  );
}

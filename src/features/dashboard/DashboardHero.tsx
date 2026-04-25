import { useMemo } from 'react';

import { Button } from '../../components/ui/Button';
import type { DashboardMode } from './types';

type DashboardHeroProps = {
  greetingName: string;
  mode: DashboardMode;
  groupCount: number;
  lastUpdatedAt: number | null;
  onSearchFocus: () => void;
  onCreateGroup: () => void;
};

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 40,
  letterSpacing: '-0.04em',
  margin: '8px 0 6px',
  lineHeight: 1.05,
} as const;

const emphasisStyle = {
  color: 'var(--signal-300)',
  fontStyle: 'normal',
  fontWeight: 500,
} as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5" />
      <path d="M14 14l-3-3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

export function DashboardHero({
  greetingName,
  mode,
  groupCount,
  lastUpdatedAt,
  onSearchFocus,
  onCreateGroup,
}: DashboardHeroProps) {
  const heading = useMemo(() => {
    if (mode === 'public') {
      if (groupCount > 0) {
        return (
          <>
            {groupCount} public groups <em style={emphasisStyle}>open</em>.
          </>
        );
      }
      return <>Discover public groups.</>;
    }

    if (groupCount > 0) {
      return (
        <>
          {groupCount} groups <em style={emphasisStyle}>running</em>.
        </>
      );
    }

    return <>No groups yet.</>;
  }, [groupCount, mode]);

  const timestampLabel = useMemo(() => {
    if (lastUpdatedAt === null) {
      return 'Syncing…';
    }
    const ts = new Date(lastUpdatedAt);
    return `Updated ${dateFormatter.format(ts)} · ${dayFormatter.format(ts)}`;
  }, [lastUpdatedAt]);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p
          className="t-label c-signal"
          style={{ letterSpacing: '0.14em' }}
        >
          Welcome back, {greetingName}
        </p>
        <h1 style={headingStyle} className="c-1">
          {heading}
        </h1>
        <p className="t-tiny c-3">{timestampLabel}</p>
      </div>
      <div className="flex shrink-0 gap-[10px]">
        <Button type="button" variant="ghost" size="md" onClick={onSearchFocus}>
          <span className="inline-flex items-center gap-2">
            <SearchIcon />
            Search groups
          </span>
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCreateGroup}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon />
            Create group
          </span>
        </Button>
      </div>
    </header>
  );
}

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';

import { Button } from '../../components/ui/Button';
import type { DashboardSortBy, DashboardSortOrder } from './DashboardFilterBar';
import type { DashboardMode } from './types';

type DashboardGroupSectionProps = {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  totalCount: number;
  joinedCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  sortBy: DashboardSortBy;
  onSortByChange: (value: DashboardSortBy) => void;
  sortOrder: DashboardSortOrder;
  onSortOrderChange: (value: DashboardSortOrder) => void;
  minReputation: string;
  onMinReputationChange: (value: string) => void;
  maxReputation: string;
  onMaxReputationChange: (value: string) => void;
  onRefresh: () => void;
  searchInputRef?: RefObject<HTMLInputElement>;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  isRefreshing?: boolean;
  children: ReactNode;
};

const numericSanitizer = (raw: string) => raw.replace(/[^\d]/g, '');

type SortKey = `${DashboardSortBy}:${DashboardSortOrder}`;

const SORT_OPTIONS: Array<{ key: SortKey; label: string; sortBy: DashboardSortBy; sortOrder: DashboardSortOrder }> = [
  { key: 'created_at:desc', label: 'Newest', sortBy: 'created_at', sortOrder: 'desc' },
  { key: 'created_at:asc', label: 'Oldest', sortBy: 'created_at', sortOrder: 'asc' },
  { key: 'min_reputation:asc', label: 'Min rep ↑', sortBy: 'min_reputation', sortOrder: 'asc' },
  { key: 'min_reputation:desc', label: 'Min rep ↓', sortBy: 'min_reputation', sortOrder: 'desc' },
];

const popoverShellStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
  boxShadow: 'var(--shadow-md)',
} as const;

const sectionTitleStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: '-0.03em',
  margin: 0,
} as const;

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap' as const,
};

const tabBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '-0.005em',
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
} as const;

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

function SlidersIcon() {
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
      <path d="M2 4h9M2 12h5M13 4h1M7 12h7" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
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
      style={spinning ? { animation: 'chainora-spin 0.8s linear infinite' } : undefined}
    >
      <path d="M13 6A5 5 0 1 0 12 12.5M13 3v3h-3" />
    </svg>
  );
}

export function DashboardGroupSection({
  mode,
  onModeChange,
  totalCount,
  joinedCount,
  query,
  onQueryChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  minReputation,
  onMinReputationChange,
  maxReputation,
  onMaxReputationChange,
  onRefresh,
  searchInputRef,
  filterOpen,
  onFilterOpenChange,
  isRefreshing = false,
  children,
}: DashboardGroupSectionProps) {
  const filterAnchorRef = useRef<HTMLDivElement | null>(null);

  const activeSortLabel = useMemo(() => {
    return SORT_OPTIONS.find(option => option.sortBy === sortBy && option.sortOrder === sortOrder)?.label ?? 'Newest';
  }, [sortBy, sortOrder]);

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count += 1;
    if (minReputation.trim()) count += 1;
    if (maxReputation.trim()) count += 1;
    if (sortBy !== 'created_at' || sortOrder !== 'desc') count += 1;
    return count;
  }, [query, minReputation, maxReputation, sortBy, sortOrder]);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (filterAnchorRef.current && !filterAnchorRef.current.contains(target)) {
        onFilterOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [filterOpen, onFilterOpenChange]);

  useEffect(() => {
    if (!filterOpen) return;
    const node = searchInputRef?.current;
    if (!node) return;
    const timer = window.setTimeout(() => node.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [filterOpen, searchInputRef]);

  const handleSortSelect = (option: typeof SORT_OPTIONS[number]) => {
    onSortByChange(option.sortBy);
    onSortOrderChange(option.sortOrder);
  };

  const resetAdvanced = () => {
    onQueryChange('');
    onMinReputationChange('');
    onMaxReputationChange('');
    onSortByChange('created_at');
    onSortOrderChange('desc');
  };

  const sectionTitle = mode === 'public' ? 'Discover groups' : 'Your groups';

  return (
    <section>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle} className="c-1">
          {sectionTitle}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onModeChange('public')}
            className={mode === 'public' ? 'chip chip-signal' : 'chip'}
            style={{
              ...tabBaseStyle,
              background: mode === 'public' ? undefined : 'var(--ink-2)',
              color: mode === 'public' ? undefined : 'var(--haze-2)',
              borderColor: mode === 'public' ? undefined : 'var(--ink-5)',
            }}
          >
            All · {totalCount}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('joined')}
            className={mode === 'joined' ? 'chip chip-signal' : 'chip'}
            style={{
              ...tabBaseStyle,
              background: mode === 'joined' ? undefined : 'var(--ink-2)',
              color: mode === 'joined' ? undefined : 'var(--haze-2)',
              borderColor: mode === 'joined' ? undefined : 'var(--ink-5)',
            }}
          >
            Joined · {joinedCount}
          </button>

          <div ref={filterAnchorRef} className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFilterOpenChange(!filterOpen)}
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersIcon />
                Filter
                {advancedFilterCount > 0 ? (
                  <span
                    className="chip chip-signal"
                    style={{ height: 18, fontSize: 10, padding: '0 6px' }}
                  >
                    {advancedFilterCount}
                  </span>
                ) : null}
              </span>
            </Button>
            {filterOpen ? (
              <div
                role="dialog"
                aria-label="Advanced filters"
                className="absolute right-0 z-30 mt-2"
                style={{
                  ...popoverShellStyle,
                  top: '100%',
                  width: 320,
                  padding: 16,
                }}
              >
                <p
                  className="t-label c-3 mb-2"
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  Search
                </p>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 c-3"
                    aria-hidden="true"
                  >
                    <SearchIcon />
                  </span>
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={event => onQueryChange(event.target.value)}
                    placeholder="Name, pool id, or address"
                    className="input w-full"
                    style={{ paddingLeft: 36 }}
                  />
                </div>

                <p
                  className="t-label c-3 mb-2 mt-3"
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  Sort by
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map(option => {
                    const isActive = option.sortBy === sortBy && option.sortOrder === sortOrder;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleSortSelect(option)}
                        className="rounded-[var(--r-sm)] px-3 py-2 text-left text-[12px] transition"
                        style={{
                          background: isActive ? 'rgba(40,151,255,0.12)' : 'var(--ink-1)',
                          border: `1px solid ${isActive ? 'rgba(40,151,255,0.4)' : 'var(--ink-5)'}`,
                          color: isActive ? 'var(--signal-300)' : 'var(--haze-1)',
                          fontWeight: isActive ? 600 : 500,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <p
                  className="t-label c-3 mb-2 mt-3"
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  Reputation range
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="t-tiny c-3">Minimum</span>
                    <input
                      value={minReputation}
                      onChange={event => onMinReputationChange(numericSanitizer(event.target.value))}
                      inputMode="numeric"
                      placeholder="0"
                      className="input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="t-tiny c-3">Maximum</span>
                    <input
                      value={maxReputation}
                      onChange={event => onMaxReputationChange(numericSanitizer(event.target.value))}
                      inputMode="numeric"
                      placeholder="1000"
                      className="input"
                    />
                  </label>
                </div>

                <div
                  className="mt-4 flex items-center justify-between gap-2 pt-3"
                  style={{ borderTop: '1px solid var(--ink-5)' }}
                >
                  <Button type="button" variant="ghost" size="sm" onClick={resetAdvanced}>
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onFilterOpenChange(false)}
                  >
                    Done
                  </Button>
                </div>

                <p className="t-tiny c-4 mt-2 text-center">
                  Sort: <span className="c-2">{activeSortLabel}</span>
                </p>
              </div>
            ) : null}
          </div>

          <style>{`@keyframes chainora-spin { to { transform: rotate(360deg); } }`}</style>
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
              <RefreshIcon spinning={isRefreshing} />
              Refresh
            </span>
          </Button>
        </div>
      </div>

      {children}
    </section>
  );
}

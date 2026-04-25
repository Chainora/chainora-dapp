import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { Button } from '../../components/ui/Button';
import type { DashboardMode } from './types';

export type DashboardSortBy = 'created_at' | 'min_reputation';
export type DashboardSortOrder = 'asc' | 'desc';

type DashboardFilterBarProps = {
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
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  onRefresh: () => void;
  searchInputRef?: RefObject<HTMLInputElement>;
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

const segmentedShellStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 999,
} as const;

const segmentBaseClass =
  'inline-flex items-center justify-center px-3 py-[5px] text-[12px] font-semibold transition';

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

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function SlidersIcon() {
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
      <path d="M2 4h9M2 12h5M13 4h1M7 12h7" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
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
      <path d="M13 6A5 5 0 1 0 12 12.5M13 3v3h-3" />
    </svg>
  );
}

export function DashboardFilterBar({
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
  mode,
  onModeChange,
  onRefresh,
  searchInputRef,
}: DashboardFilterBarProps) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const sortAnchorRef = useRef<HTMLDivElement | null>(null);
  const filterAnchorRef = useRef<HTMLDivElement | null>(null);

  const activeSortLabel = useMemo(() => {
    return SORT_OPTIONS.find(option => option.sortBy === sortBy && option.sortOrder === sortOrder)?.label ?? 'Sort';
  }, [sortBy, sortOrder]);

  const repFilterCount = useMemo(() => {
    let count = 0;
    if (minReputation.trim()) count += 1;
    if (maxReputation.trim()) count += 1;
    return count;
  }, [minReputation, maxReputation]);

  useEffect(() => {
    if (!sortMenuOpen && !filterPopoverOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (sortMenuOpen && sortAnchorRef.current && !sortAnchorRef.current.contains(target)) {
        setSortMenuOpen(false);
      }
      if (filterPopoverOpen && filterAnchorRef.current && !filterAnchorRef.current.contains(target)) {
        setFilterPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [sortMenuOpen, filterPopoverOpen]);

  const handleSortSelect = (option: typeof SORT_OPTIONS[number]) => {
    onSortByChange(option.sortBy);
    onSortOrderChange(option.sortOrder);
    setSortMenuOpen(false);
  };

  const resetReputation = () => {
    onMinReputationChange('');
    onMaxReputationChange('');
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3"
      style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--ink-5)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <div className="relative flex-1" style={{ minWidth: 260 }}>
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
          placeholder="Search by name, pool id, or address"
          className="input w-full"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="flex items-center gap-1 p-1" style={segmentedShellStyle}>
        <button
          type="button"
          onClick={() => onModeChange('public')}
          className={`${segmentBaseClass} ${
            mode === 'public' ? 'chip chip-signal' : 'c-3 hover:bg-[var(--ink-3)] rounded-full'
          }`}
          style={mode === 'public' ? undefined : { background: 'transparent', border: '0' }}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => onModeChange('joined')}
          className={`${segmentBaseClass} ${
            mode === 'joined' ? 'chip chip-signal' : 'c-3 hover:bg-[var(--ink-3)] rounded-full'
          }`}
          style={mode === 'joined' ? undefined : { background: 'transparent', border: '0' }}
        >
          Joined
        </button>
      </div>

      <div ref={sortAnchorRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSortMenuOpen(open => !open);
            setFilterPopoverOpen(false);
          }}
          aria-haspopup="menu"
          aria-expanded={sortMenuOpen}
        >
          <span className="inline-flex items-center gap-2">
            {activeSortLabel}
            <ChevronDownIcon />
          </span>
        </Button>
        {sortMenuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 p-1"
            style={{ ...popoverShellStyle, top: '100%', width: 180 }}
          >
            {SORT_OPTIONS.map(option => {
              const isActive = option.sortBy === sortBy && option.sortOrder === sortOrder;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSortSelect(option)}
                  className="flex w-full items-center justify-between rounded-[var(--r-sm)] px-3 py-2 text-left text-[13px] transition hover:bg-[var(--ink-3)]"
                  style={{
                    color: isActive ? 'var(--signal-300)' : 'var(--haze-1)',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? <span aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div ref={filterAnchorRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterPopoverOpen(open => !open);
            setSortMenuOpen(false);
          }}
          aria-haspopup="dialog"
          aria-expanded={filterPopoverOpen}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersIcon />
            Filter
            {repFilterCount > 0 ? (
              <span
                className="chip chip-signal"
                style={{ height: 18, fontSize: 10, padding: '0 6px' }}
              >
                {repFilterCount}
              </span>
            ) : null}
          </span>
        </Button>
        {filterPopoverOpen ? (
          <div
            role="dialog"
            aria-label="Reputation filter"
            className="absolute right-0 z-20 mt-2"
            style={{ ...popoverShellStyle, top: '100%', width: 260, padding: 16 }}
          >
            <p
              className="t-label c-3 mb-2"
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
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetReputation}>
                Reset
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilterPopoverOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        aria-label="Refresh"
        title="Refresh"
      >
        <RefreshIcon />
      </Button>
    </div>
  );
}

import type { ReactNode } from 'react';

import { Button } from '../../../components/ui/Button';

export type ReviewCardRow = {
  label: string;
  value: ReactNode;
  mono?: boolean;
};

type ReviewCardProps = {
  step: '01' | '02' | '03';
  title: string;
  rows: ReviewCardRow[];
  onEdit: () => void;
};

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '18px 22px',
} as const;

const checkCircleStyle = {
  background: 'var(--ok-500)',
  color: '#061a10',
  borderRadius: '50%',
} as const;

export function ReviewCard({ step, title, rows, onEdit }: ReviewCardProps) {
  return (
    <div style={cardStyle}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center text-[11px] font-bold"
            style={checkCircleStyle}
          >
            ✓
          </span>
          <p className="text-[14px] font-semibold c-1">
            {step} · {title}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-x-[18px] gap-y-[10px] sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="min-w-0">
            <p
              className="t-tiny font-semibold uppercase c-4"
              style={{ letterSpacing: '0.12em', marginBottom: 3 }}
            >
              {row.label}
            </p>
            <p
              className={`t-small font-medium c-1 truncate ${
                row.mono ? 't-mono tabular-nums' : ''
              }`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

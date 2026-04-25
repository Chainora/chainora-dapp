import type { ReactNode } from 'react';

export type SidePreviewRow = {
  label: string;
  value: ReactNode;
  mono?: boolean;
};

type SidePreviewProps = {
  title: string;
  rows: SidePreviewRow[];
  note?: ReactNode;
};

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 22px',
} as const;

export function SidePreview({ title, rows, note }: SidePreviewProps) {
  return (
    <aside className="sticky top-2 self-start">
      <div style={cardStyle}>
        <p className="t-label mb-[14px]">{title}</p>
        <div className="flex flex-col gap-[10px]">
          {rows.map((row, index) => {
            const isLast = index === rows.length - 1;
            return (
              <div
                key={`${row.label}-${index}`}
                className="flex items-baseline justify-between"
                style={{
                  paddingBottom: isLast ? 0 : 8,
                  borderBottom: isLast ? 0 : '1px solid var(--ink-5)',
                }}
              >
                <span className="t-small c-3">{row.label}</span>
                <span
                  className={`t-small font-medium c-1 text-right ${
                    row.mono ? 't-mono tabular-nums' : ''
                  }`}
                  style={{ maxWidth: '60%' }}
                >
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
        {note ? (
          <div
            className="t-tiny c-3"
            style={{
              marginTop: 'var(--s-3)',
              paddingTop: 'var(--s-3)',
              borderTop: '1px solid var(--ink-5)',
              lineHeight: 1.55,
            }}
          >
            {note}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

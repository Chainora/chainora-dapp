import type { UiToast } from '../types';

const toneStyle = (tone: UiToast['tone']): { background: string; color: string; border: string } => {
  switch (tone) {
    case 'success':
      return {
        background: 'var(--ok-bg)',
        color: 'var(--ok-300)',
        border: '1px solid rgba(16,185,129,0.4)',
      };
    case 'error':
      return {
        background: 'var(--risk-bg)',
        color: 'var(--risk-300)',
        border: '1px solid rgba(239,68,68,0.4)',
      };
    default:
      return {
        background: 'rgba(40,151,255,0.12)',
        color: 'var(--signal-300)',
        border: '1px solid rgba(40,151,255,0.4)',
      };
  }
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: UiToast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map(toast => {
        const tone = toneStyle(toast.tone);
        return (
          <div
            key={toast.id}
            className="px-3 py-2"
            style={{
              background: tone.background,
              color: tone.color,
              border: tone.border,
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-md)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="t-small font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="t-tiny shrink-0 rounded-[var(--r-sm)] px-2 py-0.5 font-semibold opacity-70 transition hover:opacity-100"
                style={{ color: 'currentColor' }}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { UiToast } from '../types';

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
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-xl border px-3 py-2 shadow-lg ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : toast.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-sky-200 bg-sky-50 text-sky-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-white/70"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

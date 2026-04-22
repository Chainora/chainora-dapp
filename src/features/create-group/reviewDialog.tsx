export function CreateGroupReviewDialog({
  open,
  statusMessage,
  isSubmitting,
  isCreatePoolSuccess,
  reviewDialogError,
  closeReviewDialog,
  onConfirm,
  onDone,
}: {
  open: boolean;
  statusMessage: string;
  isSubmitting: boolean;
  isCreatePoolSuccess: boolean;
  reviewDialogError: string;
  closeReviewDialog: () => void;
  onConfirm: () => void;
  onDone: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
      <div className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-500">Chainora Wallet Session</p>
            <h2 className="mt-1.5 text-lg font-bold text-slate-900">Sign create group request</h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={closeReviewDialog}
            aria-label="Close review dialog"
          >
            x
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-sky-700">{statusMessage}</p>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Approve this request in Chainora native app. The app will ask you to confirm and sign with NFC card.
        </p>

        {reviewDialogError ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {reviewDialogError}
          </p>
        ) : null}

        {isCreatePoolSuccess ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Group created successfully.
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={closeReviewDialog}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={isSubmitting || isCreatePoolSuccess}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Sign'}
          </button>
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            disabled={!isCreatePoolSuccess}
            onClick={onDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateGroupReviewDialog({
  open,
  reviewStatusMessage,
  isPreparingReviewSession,
  isReviewQrLocked,
  isCreatePoolSuccess,
  qrImageUrl,
  reviewDialogError,
  closeReviewDialog,
  onRefresh,
  onDone,
}: {
  open: boolean;
  reviewStatusMessage: string;
  isPreparingReviewSession: boolean;
  isReviewQrLocked: boolean;
  isCreatePoolSuccess: boolean;
  qrImageUrl: string;
  reviewDialogError: string;
  closeReviewDialog: () => void;
  onRefresh: () => void;
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
            <p className="text-xs uppercase tracking-[0.18em] text-sky-500">Chainora Native Wallet</p>
            <h2 className="mt-1.5 text-lg font-bold text-slate-900">Scan and sign create group</h2>
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
          <p className="mt-1 text-sm font-semibold text-sky-700">{reviewStatusMessage}</p>
        </div>

        <div className="mt-3 grid place-items-center">
          {isReviewQrLocked && !isCreatePoolSuccess ? (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-sky-50 p-5 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
              QR already scanned.
              <br />
              Continue on your phone and tap your card.
            </div>
          ) : qrImageUrl ? (
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <img src={qrImageUrl} alt="Create Group Review QR" className="h-[260px] w-[260px] rounded-lg object-contain" />
            </div>
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
              {isPreparingReviewSession ? 'Preparing QR...' : 'Could not create QR. Please refresh.'}
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Hold phone steady 15-25 cm for best QR scan.</p>
        {reviewDialogError ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{reviewDialogError}</p> : null}

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
            onClick={onRefresh}
            disabled={isPreparingReviewSession || isReviewQrLocked}
          >
            {isPreparingReviewSession ? 'Refreshing...' : 'Refresh QR'}
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

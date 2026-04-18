import {
  CONTRIBUTION_SYMBOL,
  toContractDurations,
  type CreateGroupInput,
} from './formSchema';

export function CreateGroupReviewDialog({
  open,
  reviewInput,
  reviewSessionId,
  reviewWsStatus,
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
  reviewInput: CreateGroupInput | null;
  reviewSessionId: string;
  reviewWsStatus: string;
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

  const reviewDurations = reviewInput
    ? toContractDurations(reviewInput.periodDuration, reviewInput.auctionWindow, reviewInput.contributionWindow)
    : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-500">Chainora Native Wallet</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Scan and sign create group</h2>
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

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Session Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{isPreparingReviewSession ? 'creating_session' : reviewWsStatus}</p>
          {reviewSessionId ? <p className="mt-1 text-xs text-slate-500">Session: {reviewSessionId}</p> : null}
          <p className="mt-2 text-sm font-semibold text-sky-700">{reviewStatusMessage}</p>
        </div>

        <div className="mt-5 grid place-items-center">
          {isReviewQrLocked && !isCreatePoolSuccess ? (
            <div className="flex h-[320px] w-[320px] items-center justify-center rounded-xl bg-sky-50 p-5 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
              QR locked after first scan. Continue in native app and tap NFC card to complete create-pool.
            </div>
          ) : qrImageUrl ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <img src={qrImageUrl} alt="Create Group Review QR" className="h-[320px] w-[320px] rounded-lg object-contain" />
            </div>
          ) : (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
              {isPreparingReviewSession ? 'Preparing QR session...' : 'Unable to generate QR payload'}
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">For best scan quality, keep your screen brightness high and hold the phone steady 15-25 cm away.</p>
        {reviewDialogError ? <p className="mt-3 text-sm font-medium text-rose-600">{reviewDialogError}</p> : null}

        {reviewInput && reviewDurations ? (
          <div className="mt-4 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
            <p>visibility: {reviewInput.groupVisibility === 'public' ? 'Public discovery' : 'Private invite-only'}</p>
            <p>contributionAmount: {reviewInput.amountPerPeriod} {CONTRIBUTION_SYMBOL}</p>
            <p>targetMembers: {reviewInput.targetMembers}</p>
            <p>groupImageUrl: {reviewInput.groupImageUrl?.trim() ? 'attached' : 'none'}</p>
            <p>periodDuration: {reviewDurations.periodDurationSeconds}s</p>
            <p>auctionWindow: {reviewDurations.auctionWindowSeconds}s</p>
            <p>contributionWindow: {reviewDurations.contributionWindowSeconds}s</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
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
            Done, check dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

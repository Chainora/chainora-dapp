type PoolActionWalletDialogProps = {
  isOpen: boolean;
  actionLabel: string;
  isPreparing: boolean;
  status: string;
  statusMessage: string;
  qrImageUrl: string;
  qrLocked: boolean;
  isSuccess: boolean;
  errorMessage: string;
  onClose: () => void;
  onRefresh: () => void;
};

export function PoolActionWalletDialog({
  isOpen,
  actionLabel,
  isPreparing,
  status,
  statusMessage,
  qrImageUrl,
  qrLocked: _qrLocked,
  isSuccess,
  errorMessage,
  onClose,
  onRefresh,
}: PoolActionWalletDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 px-4 py-8">
      <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Approve in Chainora App</h3>
            <p className="mt-1 text-sm text-slate-600">
              {actionLabel ? `Action: ${actionLabel}` : 'Approve this action'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
          <p className="mt-2 text-sm text-slate-700">{statusMessage}</p>
        </div>

        {status === 'attest_required' ? (
          <div className="mt-4 flex justify-center rounded-xl border border-slate-200 bg-white p-3">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="Device attestation QR" className="h-[320px] w-[320px] rounded-lg object-contain" />
            ) : (
              <div className="grid h-[320px] w-[320px] place-items-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                Preparing attestation QR...
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Approve this action in Chainora native app. The wallet request will require card confirmation.
          </div>
        )}

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {isSuccess ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Done. Action completed successfully.
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isSuccess && isPreparing}
            onClick={isSuccess ? onClose : onRefresh}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSuccess
              ? 'Done'
              : isPreparing
              ? 'Processing...'
              : status === 'attest_required'
                ? 'I have completed attestation'
                : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
}

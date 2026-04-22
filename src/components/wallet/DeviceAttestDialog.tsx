import { Button } from '../ui/Button';

export function DeviceAttestDialog({
  open,
  statusMessage,
  qrImageUrl,
  isChecking,
  onClose,
  onConfirm,
}: {
  open: boolean;
  statusMessage: string;
  qrImageUrl: string;
  isChecking: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-sky-500">Device Attestation</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Verify your card device</h3>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close attestation dialog"
          >
            x
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
          {statusMessage}
        </p>

        <div className="mt-4 grid place-items-center">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Device attestation QR"
              className="h-[280px] w-[280px] rounded-xl object-contain ring-1 ring-slate-200"
            />
          ) : (
            <div className="grid h-[280px] w-[280px] place-items-center rounded-xl bg-slate-100 text-sm text-slate-500">
              Preparing QR...
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onConfirm}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'I have completed attestation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

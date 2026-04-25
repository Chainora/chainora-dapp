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
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(5,7,13,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          background: 'var(--ink-2)',
          border: '1px solid var(--ink-6)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg), 0 0 60px -10px rgba(40,151,255,0.3)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="t-label" style={{ color: 'var(--signal-300)' }}>Device Attestation</p>
            <h3 className="t-h3 c-1 mt-1" style={{ fontFamily: 'var(--font-display)' }}>
              Verify your card device
            </h3>
          </div>
          <button
            type="button"
            className="rounded-full p-2 transition"
            style={{ color: 'var(--haze-3)' }}
            onMouseEnter={event => {
              event.currentTarget.style.background = 'var(--ink-3)';
              event.currentTarget.style.color = 'var(--haze-1)';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.background = 'transparent';
              event.currentTarget.style.color = 'var(--haze-3)';
            }}
            onClick={onClose}
            aria-label="Close attestation dialog"
          >
            ×
          </button>
        </div>

        <p
          className="t-small c-2 mt-4 p-3 font-medium"
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {statusMessage}
        </p>

        <div className="mt-4 grid place-items-center">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Device attestation QR"
              className="h-[280px] w-[280px] object-contain"
              style={{ background: 'white', borderRadius: 'var(--r-md)' }}
            />
          ) : (
            <div
              className="grid h-[280px] w-[280px] place-items-center"
              style={{
                background: 'var(--ink-3)',
                color: 'var(--haze-3)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <span className="t-small">Preparing QR...</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={onConfirm} disabled={isChecking}>
            {isChecking ? 'Checking...' : 'I have completed attestation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Button } from '../../../components/ui/Button';

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

const surfaceStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

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
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
      style={{ background: 'rgba(5,7,13,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="max-h-[95vh] w-full max-w-xl overflow-y-auto p-6"
        style={{
          background: 'var(--ink-2)',
          border: '1px solid var(--ink-6)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg), 0 0 60px -10px rgba(40,151,255,0.3)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="t-h3 c-1" style={{ fontFamily: 'var(--font-display)' }}>
              Approve in Chainora App
            </h3>
            <p className="t-small c-2 mt-1">
              {actionLabel ? `Action: ${actionLabel}` : 'Approve this action'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 p-3" style={surfaceStyle}>
          <p className="t-label">Status</p>
          <p className="t-small c-2 mt-2">{statusMessage}</p>
        </div>

        {status === 'attest_required' ? (
          <div className="mt-4 flex justify-center p-3" style={surfaceStyle}>
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="Device attestation QR"
                className="h-[320px] w-[320px] object-contain"
                style={{ background: 'white', borderRadius: 'var(--r-md)' }}
              />
            ) : (
              <div
                className="grid h-[320px] w-[320px] place-items-center"
                style={{ background: 'var(--ink-3)', color: 'var(--haze-3)', borderRadius: 'var(--r-md)' }}
              >
                <span className="t-small font-medium">Preparing attestation QR...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="t-small c-2 mt-4 p-4" style={surfaceStyle}>
            Approve this action in Chainora native app. The wallet request will require card confirmation.
          </div>
        )}

        {errorMessage ? (
          <p
            className="t-small mt-3 px-3 py-2"
            style={{
              background: 'var(--risk-bg)',
              color: 'var(--risk-300)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 'var(--r-md)',
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        {isSuccess ? (
          <p
            className="t-small mt-3 px-3 py-2"
            style={{
              background: 'var(--ok-bg)',
              color: 'var(--ok-300)',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: 'var(--r-md)',
            }}
          >
            Done. Action completed successfully.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!isSuccess && isPreparing}
            onClick={isSuccess ? onClose : onRefresh}
          >
            {isSuccess
              ? 'Done'
              : isPreparing
              ? 'Processing...'
              : status === 'attest_required'
                ? 'I have completed attestation'
                : 'Retry'}
          </Button>
        </div>
      </div>
    </div>
  );
}

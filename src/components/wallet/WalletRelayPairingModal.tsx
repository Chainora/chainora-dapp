import { useEffect, useMemo, useRef, useState } from 'react';

import { buildQrImageUrl } from '../../services/qrFlow';
import { walletRelayUiStore, type WalletRelayPairingState } from '../../stores/walletRelayUiStore';
import { Button } from '../ui/Button';

const resolveStatusMessage = (state: WalletRelayPairingState): string => {
  if (state.error) {
    return state.error;
  }

  switch (state.status) {
    case 'pairing':
      return 'Scan this QR with Chainora native wallet.';
    case 'scanned':
      return 'QR scanned. Please verify in Chainora Wallet.';
    case 'awaiting_approval':
      return 'Approve connect request in mobile wallet.';
    case 'connected':
      return 'Wallet connected.';
    case 'error':
      return 'Wallet pairing failed.';
    case 'idle':
    default:
      return 'Preparing pairing session...';
  }
};

const formatSessionDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 'N/A';
  }

  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));
  if (totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return totalMinutes === 1 ? '1 minute' : `${totalMinutes} minutes`;
};

export function WalletRelayPairingModal() {
  const [state, setState] = useState<WalletRelayPairingState>(() => walletRelayUiStore.getState());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const expiredRefreshSessionRef = useRef<string>('');

  useEffect(() => {
    return walletRelayUiStore.subscribe(next => {
      setState(next);
    });
  }, []);

  useEffect(() => {
    if (!state.isOpen) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.isOpen]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(state.pairingUri, 320), [state.pairingUri]);
  const statusMessage = useMemo(() => resolveStatusMessage(state), [state]);
  const expiresAtMs = useMemo(() => {
    const parsed = Date.parse(state.expiresAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [state.expiresAt]);
  const remainingMs = useMemo(
    () => (expiresAtMs > 0 ? Math.max(0, expiresAtMs - nowMs) : 0),
    [expiresAtMs, nowMs],
  );
  const sessionDurationLabel = useMemo(() => {
    if (expiresAtMs <= 0) {
      return 'N/A';
    }
    return formatSessionDuration(Math.max(0, expiresAtMs - Date.now()));
  }, [expiresAtMs, state.sessionId]);

  useEffect(() => {
    if (!state.isOpen || expiresAtMs <= 0 || remainingMs > 0) {
      return;
    }
    if (state.status === 'connected' || state.status === 'error' || state.status === 'idle') {
      return;
    }
    if (expiredRefreshSessionRef.current === state.sessionId) {
      return;
    }
    expiredRefreshSessionRef.current = state.sessionId;
    walletRelayUiStore.refreshPairing();
  }, [expiresAtMs, remainingMs, state.isOpen, state.sessionId, state.status]);

  useEffect(() => {
    if (remainingMs > 0 && expiredRefreshSessionRef.current === state.sessionId) {
      expiredRefreshSessionRef.current = '';
    }
  }, [remainingMs, state.sessionId]);

  if (!state.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[160] grid place-items-center p-4"
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
            <p className="t-label" style={{ color: 'var(--signal-300)' }}>Chainora Relay Pairing</p>
            <h3 className="t-h3 c-1 mt-1" style={{ fontFamily: 'var(--font-display)' }}>
              Connect mobile wallet
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close pairing"
            className="rounded-full p-2 transition"
            style={{ color: 'var(--haze-3)' }}
            onClick={() => walletRelayUiStore.closePairing({ invokeCancel: true })}
            onMouseEnter={event => {
              event.currentTarget.style.background = 'var(--ink-3)';
              event.currentTarget.style.color = 'var(--haze-1)';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.background = 'transparent';
              event.currentTarget.style.color = 'var(--haze-3)';
            }}
          >
            ×
          </button>
        </div>

        <div
          className="mt-4 p-4"
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <p className="t-label">Status</p>
          <p
            className="t-small mt-2 font-semibold"
            style={{ color: state.error ? 'var(--risk-300)' : 'var(--signal-300)' }}
          >
            {statusMessage}
          </p>
          <div className="t-tiny c-3 mt-3 flex items-center justify-between">
            <span>Session duration</span>
            <span className="t-mono c-1 font-semibold">{sessionDurationLabel}</span>
          </div>
        </div>

        <div className="mt-5 grid min-h-[320px] place-items-center">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Wallet relay pairing QR"
              className="h-[300px] w-[300px] object-contain"
              style={{ background: 'white', borderRadius: 'var(--r-md)' }}
            />
          ) : (
            <div
              className="flex h-[300px] w-[300px] items-center justify-center text-center"
              style={{
                background: 'var(--ink-3)',
                color: 'var(--haze-3)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <span className="t-small">Preparing pairing QR...</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => walletRelayUiStore.closePairing({ invokeCancel: true })}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

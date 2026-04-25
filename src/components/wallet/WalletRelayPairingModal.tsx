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
    <div className="fixed inset-0 z-[160] grid place-items-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-sky-500">Chainora Relay Pairing</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Connect mobile wallet</h3>
          </div>
          <button
            type="button"
            aria-label="Close pairing"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={() => walletRelayUiStore.closePairing({ invokeCancel: true })}
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
          <p className={`mt-2 text-sm font-semibold ${state.error ? 'text-rose-600' : 'text-sky-700'}`}>
            {statusMessage}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Session duration</span>
            <span className="font-semibold text-slate-800">{sessionDurationLabel}</span>
          </div>
        </div>

        <div className="mt-5 grid min-h-[320px] place-items-center">
          {qrImageUrl ? (
            <img src={qrImageUrl} alt="Wallet relay pairing QR" className="h-[300px] w-[300px] rounded-xl object-contain ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-[300px] w-[300px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
              Preparing pairing QR...
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

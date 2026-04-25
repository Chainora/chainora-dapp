export type WalletRelayPairingStatus =
  | 'idle'
  | 'pairing'
  | 'scanned'
  | 'awaiting_approval'
  | 'connected'
  | 'error';

export type WalletRelayPairingState = {
  isOpen: boolean;
  pairingUri: string;
  sessionId: string;
  expiresAt: string;
  requestTimeoutMs: number;
  status: WalletRelayPairingStatus;
  error: string;
};

const initialState: WalletRelayPairingState = {
  isOpen: false,
  pairingUri: '',
  sessionId: '',
  expiresAt: '',
  requestTimeoutMs: 0,
  status: 'idle',
  error: '',
};

type Listener = (state: WalletRelayPairingState) => void;

const listeners = new Set<Listener>();
let state: WalletRelayPairingState = initialState;
let cancelCallback: (() => void) | null = null;
let refreshCallback: (() => void) | null = null;

const emit = () => {
  listeners.forEach(listener => {
    listener(state);
  });
};

export const walletRelayUiStore = {
  getState(): WalletRelayPairingState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  openPairing(
    next: Omit<WalletRelayPairingState, 'isOpen' | 'error'>,
    onCancel?: () => void,
    onRefresh?: () => void,
  ) {
    state = {
      isOpen: true,
      pairingUri: next.pairingUri,
      sessionId: next.sessionId,
      expiresAt: next.expiresAt,
      requestTimeoutMs: next.requestTimeoutMs,
      status: next.status,
      error: '',
    };
    cancelCallback = onCancel ?? null;
    refreshCallback = onRefresh ?? null;
    emit();
  },
  setStatus(status: WalletRelayPairingStatus) {
    state = {
      ...state,
      status,
    };
    emit();
  },
  setError(error: string) {
    state = {
      ...state,
      status: 'error',
      error,
    };
    emit();
  },
  closePairing(options?: { invokeCancel?: boolean }) {
    const shouldCancel = options?.invokeCancel ?? false;
    const callback = cancelCallback;
    cancelCallback = null;
    refreshCallback = null;
    state = initialState;
    emit();

    if (shouldCancel && callback) {
      callback();
    }
  },
  refreshPairing() {
    if (refreshCallback) {
      refreshCallback();
    }
  },
};

import { getAddress, isAddress } from 'viem';

import { chainoraApiBase } from '../configs/api';
import { walletRelayUiStore } from '../stores/walletRelayUiStore';
import { walletDebugLog } from './walletDebugLog';
import {
  createRelayRequestId,
  RELAY_MESSAGE_TYPES,
  sha256Hex,
  type WalletRelayMessage,
  type WalletRelayPairResponse,
} from './walletRelayProtocol';

type RelaySessionState = {
  sessionId: string;
  browserToken: string;
  chainId: number;
  origin: string;
  address: string;
  expiresAtMs: number;
  relayWsBase: string;
  requestTimeoutMs: number;
};

type RelaySocketCredentials = Pick<RelaySessionState, 'sessionId' | 'browserToken' | 'relayWsBase'>;

type PendingRelayRequest = {
  resolve: (message: WalletRelayMessage<Record<string, unknown>>) => void;
  reject: (error: Error) => void;
  timer: number;
};

type RelayEnvelope<T> = T | { success?: boolean; data?: T; error?: string };

const CONNECT_FLOW_TIMEOUT_MS = Number(import.meta.env.VITE_CHAINORA_RELAY_CONNECT_TIMEOUT_MS ?? 45_000);
const RELAY_SESSION_STORAGE_KEY = 'chainora.walletRelay.session.v1';
const REFRESH_PAIRING_SIGNAL = '__CHAINORA_REFRESH_PAIRING__';

const loadRelaySessionFromStorage = (): RelaySessionState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(RELAY_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<RelaySessionState>;
    if (
      typeof parsed.sessionId !== 'string'
      || typeof parsed.browserToken !== 'string'
      || typeof parsed.chainId !== 'number'
      || typeof parsed.origin !== 'string'
      || typeof parsed.address !== 'string'
      || typeof parsed.expiresAtMs !== 'number'
      || typeof parsed.relayWsBase !== 'string'
      || typeof parsed.requestTimeoutMs !== 'number'
    ) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      browserToken: parsed.browserToken,
      chainId: parsed.chainId,
      origin: parsed.origin,
      address: parsed.address,
      expiresAtMs: parsed.expiresAtMs,
      relayWsBase: parsed.relayWsBase,
      requestTimeoutMs: parsed.requestTimeoutMs,
    };
  } catch {
    return null;
  }
};

const persistRelaySessionToStorage = (session: RelaySessionState | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!session) {
      window.sessionStorage.removeItem(RELAY_SESSION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(RELAY_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Best effort only.
  }
};

const normalizeEnvelope = <T>(raw: RelayEnvelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }

  return raw as T;
};

const normalizeError = (raw: unknown, fallback: string): Error => {
  if (raw instanceof Error) {
    return raw;
  }

  if (typeof raw === 'string' && raw.trim()) {
    return new Error(raw.trim());
  }

  return new Error(fallback);
};

const parseRelayErrorCode = (raw: unknown): string => {
  const message = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  if (!message) {
    return '';
  }

  if (/^USER_REJECTED\b/i.test(message)) {
    return 'USER_REJECTED';
  }
  if (/^LOGIN_SCAN_REQUIRED\b/i.test(message)) {
    return 'LOGIN_SCAN_REQUIRED';
  }
  return '';
};

const buildRelayRequestError = (raw: unknown, fallback: string): Error => {
  const message = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  const code = parseRelayErrorCode(message);
  if (!code) {
    return new Error(message);
  }

  if (code === 'USER_REJECTED') {
    const rejected = new Error('User rejected request in mobile wallet.');
    (rejected as Error & { code?: number; relayCode?: string }).code = 4001;
    (rejected as Error & { code?: number; relayCode?: string }).relayCode = code;
    return rejected;
  }

  const retry = new Error('One-tap login was not completed. Please scan QR and tap card again.');
  (retry as Error & { relayCode?: string }).relayCode = code;
  return retry;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => {
  window.setTimeout(resolve, ms);
});

const isRetryableConnectError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower.includes('mobile peer is not connected')
    || lower.includes('request timeout')
    || lower.includes('relay websocket closed')
    || lower.includes('relay websocket is not connected');
};

const shouldRefreshPairing = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower === REFRESH_PAIRING_SIGNAL.toLowerCase()
    || lower.includes('relay session expired')
    || lower.includes('pairing token already used')
    || lower.includes('relay session not found')
    || lower.includes('session expired');
};

const toCanonicalAddress = (raw: string): string => {
  if (!isAddress(raw)) {
    return '';
  }

  return getAddress(raw).toLowerCase();
};

type SendRelayRequest = {
  type: typeof RELAY_MESSAGE_TYPES.connect | typeof RELAY_MESSAGE_TYPES.signMessage | typeof RELAY_MESSAGE_TYPES.signTransaction;
  payload: Record<string, unknown>;
  address?: string;
  chainId: string;
  origin: string;
};

export type RelayConnectIntent = 'default' | 'login';

export class WalletRelayBrowserClient {
  private ws: WebSocket | null = null;

  private session: RelaySessionState | null = null;

  private pending = new Map<string, PendingRelayRequest>();

  private connectInFlight: Promise<string> | null = null;

  private pairingCancelled = false;

  private refreshPairingRequested = false;

  private pendingConnectIntent: RelayConnectIntent = 'default';

  constructor() {
    this.restoreSessionFromStorage();
  }

  getSession(): RelaySessionState | null {
    return this.session;
  }

  getConnectedAddress(): string {
    return this.session?.address ?? '';
  }

  isAuthorized(): boolean {
    if (!this.session) {
      return false;
    }

    if (!this.session.address) {
      return false;
    }

    if (Date.now() >= this.session.expiresAtMs) {
      return false;
    }

    return this.ws?.readyState === WebSocket.OPEN;
  }

  setNextConnectIntent(intent: RelayConnectIntent) {
    this.pendingConnectIntent = intent;
  }

  async connect(chainId: number, options?: { intent?: RelayConnectIntent }): Promise<string> {
    this.restoreSessionFromStorage();
    this.pairingCancelled = false;
    this.refreshPairingRequested = false;
    const intent = options?.intent ?? this.pendingConnectIntent;
    this.pendingConnectIntent = 'default';

    if (this.isAuthorized() && this.session && this.session.chainId === chainId) {
      walletDebugLog.info('relay.connect.short_circuit.authorized', {
        chainId,
        sessionId: this.session.sessionId,
        address: this.session.address,
      });
      return this.session.address;
    }

    if (!this.connectInFlight) {
      this.connectInFlight = this.connectWithSessionReuse(chainId, intent).finally(() => {
        this.connectInFlight = null;
      });
    }

    return this.connectInFlight;
  }

  disconnect(options?: { keepUiState?: boolean }) {
    walletDebugLog.info('relay.disconnect', {
      keepUiState: Boolean(options?.keepUiState),
      sessionId: this.session?.sessionId ?? '',
      address: this.session?.address ?? '',
    });
    this.rejectAllPending(new Error('Relay session disconnected.'));
    this.closeSocket();
    this.setSession(null);

    if (!options?.keepUiState) {
      walletRelayUiStore.closePairing();
    }
  }

  cancelPairing() {
    this.pairingCancelled = true;
    this.disconnect({ keepUiState: true });
    walletRelayUiStore.setError('Pairing cancelled.');
  }

  async requestSignMessage(params: {
    chainId: number;
    origin: string;
    address: string;
    message: string;
  }): Promise<string> {
    const canonicalAddress = toCanonicalAddress(params.address);
    if (!canonicalAddress) {
      throw new Error('Invalid wallet address for signMessage.');
    }

    const response = await this.sendRequest({
      type: RELAY_MESSAGE_TYPES.signMessage,
      chainId: String(params.chainId),
      origin: params.origin,
      address: canonicalAddress,
      payload: {
        address: canonicalAddress,
        message: params.message,
      },
    });

    const signatureFromPayload = (response.payload as { signature?: string } | undefined)?.signature ?? '';
    const signature = typeof signatureFromPayload === 'string' ? signatureFromPayload.trim() : '';
    if (!signature) {
      throw new Error('Missing signature from mobile wallet.');
    }

    return signature;
  }

  async requestSendTransaction(params: {
    chainId: number;
    origin: string;
    address: string;
    transaction: Record<string, unknown>;
  }): Promise<string> {
    const canonicalAddress = toCanonicalAddress(params.address);
    if (!canonicalAddress) {
      throw new Error('Invalid wallet address for signTransaction.');
    }

    const response = await this.sendRequest({
      type: RELAY_MESSAGE_TYPES.signTransaction,
      chainId: String(params.chainId),
      origin: params.origin,
      address: canonicalAddress,
      payload: {
        address: canonicalAddress,
        transaction: params.transaction,
      },
    });

    const payload = (response.payload as { txHash?: string; transactionHash?: string } | undefined) ?? {};
    const hashRaw = payload.txHash ?? payload.transactionHash ?? '';
    const txHash = typeof hashRaw === 'string' ? hashRaw.trim() : '';
    if (!txHash) {
      throw new Error('Missing txHash from mobile wallet.');
    }

    return txHash;
  }

  private async connectInternal(chainId: number, connectIntent: RelayConnectIntent): Promise<string> {
    while (!this.pairingCancelled) {
      this.refreshPairingRequested = false;

      let pair: WalletRelayPairResponse;
      try {
        pair = await this.createPair(chainId);
        walletDebugLog.info('relay.pair.created', {
          sessionId: pair.sessionId,
          chainId: pair.chainId,
          expiresAt: pair.expiresAt,
          relayWsBase: pair.relayWsBase,
          intent: connectIntent,
          requestTimeoutMs: pair.requestTimeoutMs,
        });
      } catch (error) {
        const normalized = normalizeError(error, 'Could not create wallet relay pairing.');
        walletRelayUiStore.setError(normalized.message);
        this.disconnect({ keepUiState: true });
        throw normalized;
      }

      console.info('[wallet-relay][dapp] pair.created', {
        sessionId: pair.sessionId,
        chainId: pair.chainId,
        relayWsBase: pair.relayWsBase,
        expiresAt: pair.expiresAt,
        pairingUri: pair.pairingUri,
      });
      const expiresAtMs = Number.isFinite(Date.parse(pair.expiresAt)) ? Date.parse(pair.expiresAt) : Date.now() + 60 * 60_000;
      const requestTimeoutMs = Number.isFinite(pair.requestTimeoutMs) && pair.requestTimeoutMs > 0
        ? pair.requestTimeoutMs
        : CONNECT_FLOW_TIMEOUT_MS;

      this.setSession({
        sessionId: pair.sessionId,
        browserToken: pair.browserToken,
        chainId,
        origin: pair.origin,
        address: '',
        expiresAtMs,
        relayWsBase: pair.relayWsBase,
        requestTimeoutMs,
      });

      walletRelayUiStore.openPairing(
        {
          pairingUri: pair.pairingUri,
          sessionId: pair.sessionId,
          expiresAt: pair.expiresAt,
          requestTimeoutMs,
          status: 'pairing',
        },
        () => {
          this.cancelPairing();
        },
        () => {
          this.requestPairingRefresh();
        },
      );

      try {
        await this.openSocket(pair);
        walletDebugLog.info('relay.socket.opened', {
          sessionId: pair.sessionId,
        });
        walletRelayUiStore.setStatus('awaiting_approval');

        while (true) {
          if (this.pairingCancelled) {
            throw new Error('Pairing cancelled.');
          }
          if (!this.session) {
            throw new Error('Relay session was closed before connect approval.');
          }
          if (this.refreshPairingRequested || Date.now() >= this.session.expiresAtMs) {
            throw new Error(REFRESH_PAIRING_SIGNAL);
          }

          try {
            const connectResult = await this.sendRequest({
              type: RELAY_MESSAGE_TYPES.connect,
              chainId: pair.chainId,
              origin: pair.origin,
              payload: {
                chainId: pair.chainId,
                origin: pair.origin,
                intent: connectIntent,
              },
            });

            const approvedAddress = toCanonicalAddress(
              connectResult.address
              || String((connectResult.payload as { address?: string } | undefined)?.address ?? ''),
            );
            if (!approvedAddress) {
              throw new Error('Connect approval did not include a valid address.');
            }

            if (!this.session) {
              throw new Error('Relay session was closed before connect approval.');
            }

            this.setSession({
              ...this.session,
              address: approvedAddress,
            });
            walletDebugLog.info('relay.connect.approved', {
              sessionId: pair.sessionId,
              address: approvedAddress,
              intent: connectIntent,
            });
            console.info('[wallet-relay][dapp] connect.approved', {
              sessionId: pair.sessionId,
              address: approvedAddress,
            });

            walletRelayUiStore.setStatus('connected');
            walletRelayUiStore.closePairing();
            return approvedAddress;
          } catch (connectError) {
            const normalized = normalizeError(connectError, 'Connect request failed.');
            walletDebugLog.warn('relay.connect.request_failed', {
              sessionId: pair.sessionId,
              intent: connectIntent,
              message: normalized.message,
            });
            if (this.pairingCancelled) {
              throw new Error('Pairing cancelled.');
            }
            if (this.refreshPairingRequested || shouldRefreshPairing(normalized.message)) {
              throw new Error(REFRESH_PAIRING_SIGNAL);
            }
            if (!isRetryableConnectError(normalized.message)) {
              throw normalized;
            }
            await sleep(900);
          }
        }
      } catch (error) {
        const normalized = normalizeError(error, 'Could not connect mobile wallet via relay.');
        walletDebugLog.warn('relay.connect.failed', {
          sessionId: pair.sessionId,
          intent: connectIntent,
          message: normalized.message,
        });
        if (this.pairingCancelled) {
          this.disconnect({ keepUiState: true });
          throw new Error('Pairing cancelled.');
        }

        if (shouldRefreshPairing(normalized.message) || this.refreshPairingRequested) {
          console.info('[wallet-relay][dapp] pair.refresh', {
            sessionId: pair.sessionId,
            reason: normalized.message,
          });
          this.refreshPairingRequested = false;
          this.rejectAllPending(new Error(REFRESH_PAIRING_SIGNAL));
          this.closeSocket();
          this.setSession(null);
          walletDebugLog.info('relay.pair.refresh', {
            sessionId: pair.sessionId,
            reason: normalized.message,
          });
          continue;
        }

        console.warn('[wallet-relay][dapp] connect.failed', {
          sessionId: pair.sessionId,
          message: normalized.message,
        });
        walletRelayUiStore.setError(normalized.message);
        this.disconnect({ keepUiState: true });
        throw normalized;
      }
    }

    this.disconnect({ keepUiState: true });
    throw new Error('Pairing cancelled.');
  }

  private async connectWithSessionReuse(chainId: number, connectIntent: RelayConnectIntent): Promise<string> {
    const resumedAddress = await this.tryResumeExistingSession(chainId, connectIntent);
    if (resumedAddress) {
      return resumedAddress;
    }

    return this.connectInternal(chainId, connectIntent);
  }

  private async tryResumeExistingSession(chainId: number, connectIntent: RelayConnectIntent): Promise<string | null> {
    const existingSession = this.session;
    if (!existingSession || existingSession.chainId !== chainId) {
      walletDebugLog.info('relay.resume.skip', {
        reason: 'no session or chain mismatch',
        chainId,
        existingChainId: existingSession?.chainId ?? null,
      });
      return null;
    }

    if (Date.now() >= existingSession.expiresAtMs) {
      walletDebugLog.info('relay.resume.expired', {
        sessionId: existingSession.sessionId,
      });
      this.setSession(null);
      return null;
    }

    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.openSocket({
          sessionId: existingSession.sessionId,
          relayWsBase: existingSession.relayWsBase,
          browserToken: existingSession.browserToken,
        });
      }

      const connectResult = await this.sendRequest({
        type: RELAY_MESSAGE_TYPES.connect,
        chainId: String(existingSession.chainId),
        origin: existingSession.origin,
        payload: {
          chainId: String(existingSession.chainId),
          origin: existingSession.origin,
          intent: connectIntent,
        },
      });

      const approvedAddress = toCanonicalAddress(
        connectResult.address
        || String((connectResult.payload as { address?: string } | undefined)?.address ?? ''),
      );
      if (!approvedAddress) {
        throw new Error('Connect approval did not include a valid address.');
      }

      this.setSession({
        ...existingSession,
        address: approvedAddress,
      });
      walletDebugLog.info('relay.resume.success', {
        sessionId: existingSession.sessionId,
        address: approvedAddress,
        intent: connectIntent,
      });
      return approvedAddress;
    } catch (error) {
      const normalized = normalizeError(error, 'Could not resume wallet relay session.');
      console.warn('[wallet-relay][dapp] resume.failed', {
        sessionId: existingSession.sessionId,
        message: normalized.message,
      });
      walletDebugLog.warn('relay.resume.failed', {
        sessionId: existingSession.sessionId,
        intent: connectIntent,
        message: normalized.message,
      });

      this.closeSocket();
      if (
        /expired|invalid token|invalid session|unauthorized|forbidden/i.test(normalized.message)
      ) {
        this.setSession(null);
      }

      return null;
    }
  }

  private async createPair(chainId: number): Promise<WalletRelayPairResponse> {
    const response = await fetch(`${chainoraApiBase}/v1/wallet-relay/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId: String(chainId),
      }),
    });

    const payload = (await response.json()) as RelayEnvelope<WalletRelayPairResponse>;
    if (!response.ok) {
      const normalized = normalizeEnvelope(payload) as unknown as { error?: string };
      const message = typeof normalized?.error === 'string' ? normalized.error : `Pair request failed: ${response.status}`;
      throw new Error(message);
    }

    const pair = normalizeEnvelope(payload);
    if (!pair.sessionId || !pair.pairingToken || !pair.browserToken || !pair.pairingUri || !pair.relayWsBase) {
      throw new Error('Invalid pair response from wallet relay.');
    }

    return pair;
  }

  private async openSocket(credentials: RelaySocketCredentials): Promise<void> {
    const wsUrl = `${credentials.relayWsBase}/${encodeURIComponent(credentials.sessionId)}`
      + `?role=browser&token=${encodeURIComponent(credentials.browserToken)}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;
    walletDebugLog.info('relay.socket.connecting', {
      sessionId: credentials.sessionId,
      relayWsBase: credentials.relayWsBase,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Relay websocket connection timed out.'));
      }, CONNECT_FLOW_TIMEOUT_MS);

      const cleanup = () => {
        window.clearTimeout(timeout);
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
      };

      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Could not connect relay websocket.'));
      };

      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
    });

    ws.onmessage = event => {
      this.handleSocketMessage(event.data);
    };
    ws.onclose = () => {
      walletDebugLog.warn('relay.socket.closed', {
        sessionId: this.session?.sessionId ?? credentials.sessionId,
      });
      this.rejectAllPending(new Error('Relay websocket closed.'));
      if (this.session && Date.now() >= this.session.expiresAtMs) {
        this.setSession(null);
      }
      this.ws = null;
    };
  }

  private closeSocket() {
    if (!this.ws) {
      return;
    }

    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws.close();
    this.ws = null;
  }

  private requestPairingRefresh() {
    if (this.pairingCancelled) {
      return;
    }

    this.refreshPairingRequested = true;
    walletDebugLog.info('relay.pair.refresh.requested', {
      sessionId: this.session?.sessionId ?? '',
    });
    this.rejectAllPending(new Error(REFRESH_PAIRING_SIGNAL));
    this.closeSocket();
  }

  private async sendRequest(request: SendRelayRequest): Promise<WalletRelayMessage<Record<string, unknown>>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Relay websocket is not connected.');
    }
    if (!this.session) {
      throw new Error('Relay session is not initialized.');
    }
    if (request.type !== RELAY_MESSAGE_TYPES.connect && !this.session.address) {
      throw new Error('Wallet relay account is not connected.');
    }

    const requestId = createRelayRequestId();
    const payloadHash = await sha256Hex(request.payload);
    const address = request.address ?? this.session.address;
    const normalizedAddress = address ? toCanonicalAddress(address) : '';
    const timeoutMs = this.session.requestTimeoutMs > 0 ? this.session.requestTimeoutMs : CONNECT_FLOW_TIMEOUT_MS;

    const message: WalletRelayMessage<Record<string, unknown>> = {
      type: request.type,
      sessionId: this.session.sessionId,
      requestId,
      timestamp: Date.now(),
      chainId: request.chainId,
      origin: request.origin,
      address: normalizedAddress || undefined,
      payloadHash,
      payload: request.payload,
    };

    walletDebugLog.info('relay.request.send', {
      sessionId: this.session.sessionId,
      requestId,
      type: request.type,
      chainId: request.chainId,
      origin: request.origin,
      address: normalizedAddress || '',
      payloadHash,
      timeoutMs,
    });

    const response = await new Promise<WalletRelayMessage<Record<string, unknown>>>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        walletDebugLog.warn('relay.request.timeout', {
          sessionId: this.session?.sessionId ?? '',
          requestId,
          type: request.type,
          timeoutMs,
        });
        reject(new Error(`Relay request timeout (${request.type}).`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });
      try {
        this.ws?.send(JSON.stringify(message));
      } catch (error) {
        window.clearTimeout(timer);
        this.pending.delete(requestId);
        walletDebugLog.error('relay.request.send_failed', {
          sessionId: this.session?.sessionId ?? '',
          requestId,
          type: request.type,
          message: error instanceof Error ? error.message : String(error),
        });
        reject(normalizeError(error, `Could not send relay request (${request.type}).`));
      }
    });

    return response;
  }

  private handleSocketMessage(raw: unknown) {
    let message: WalletRelayMessage<Record<string, unknown>>;
    try {
      message = JSON.parse(String(raw)) as WalletRelayMessage<Record<string, unknown>>;
    } catch {
      return;
    }

    if (message.type === RELAY_MESSAGE_TYPES.pair) {
      const payload = (message.payload as { event?: string } | undefined) ?? {};
      const event = typeof payload.event === 'string' ? payload.event.trim().toLowerCase() : '';
      if (event === 'mobile_connected') {
        walletDebugLog.info('relay.pair.mobile_connected', {
          sessionId: message.sessionId ?? this.session?.sessionId ?? '',
        });
        walletRelayUiStore.setStatus('scanned');
      }
      return;
    }

    const requestId = typeof message.requestId === 'string' ? message.requestId : '';
    if (!requestId) {
      return;
    }

    const pending = this.pending.get(requestId);
    if (!pending) {
      return;
    }

    window.clearTimeout(pending.timer);
    this.pending.delete(requestId);

    if (message.type === RELAY_MESSAGE_TYPES.approve) {
      walletDebugLog.info('relay.request.approve', {
        sessionId: message.sessionId ?? this.session?.sessionId ?? '',
        requestId,
        address: message.address ?? '',
      });
      pending.resolve(message);
      return;
    }

    const fallback = message.type === RELAY_MESSAGE_TYPES.reject
      ? 'Request rejected in mobile wallet.'
      : 'Wallet relay request failed.';
    walletDebugLog.warn('relay.request.failed', {
      sessionId: message.sessionId ?? this.session?.sessionId ?? '',
      requestId,
      type: message.type,
      error: message.error ?? fallback,
    });
    pending.reject(buildRelayRequestError(message.error, fallback));
  }

  private rejectAllPending(error: Error) {
    walletDebugLog.warn('relay.pending.reject_all', {
      count: this.pending.size,
      message: error.message,
      sessionId: this.session?.sessionId ?? '',
    });
    this.pending.forEach(pending => {
      window.clearTimeout(pending.timer);
      pending.reject(error);
    });
    this.pending.clear();
  }

  private restoreSessionFromStorage() {
    if (this.session) {
      return;
    }

    const stored = loadRelaySessionFromStorage();
    if (!stored) {
      return;
    }

    if (Date.now() >= stored.expiresAtMs) {
      persistRelaySessionToStorage(null);
      return;
    }

    this.session = stored;
  }

  private setSession(next: RelaySessionState | null) {
    this.session = next;
    persistRelaySessionToStorage(next);
  }
}

export const walletRelayBrowserClient = new WalletRelayBrowserClient();

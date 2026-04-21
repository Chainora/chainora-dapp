import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

import { chainoraApiBase } from '../../configs/api';
import { UserDetail } from '../UserDetail';
import { useAuth } from '../../context/AuthContext';
import {
  AuthSessionResponse,
  buildAuthQrPayload,
  createAuthSession,
  openAuthLoginSocket,
} from '../../services/authQrFlow';
import { buildQrImageUrl } from '../../services/qrFlow';
import { Button } from '../ui/Button';

const normalizeLoginError = (raw: unknown): string => {
  const fallback = 'Could not start login. Please refresh QR and try again.';
  const message = raw instanceof Error ? raw.message.trim() : '';
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('session')
    || lower.includes('payload')
    || lower.includes('websocket')
    || lower.includes('status')
    || lower.includes('nonce')
    || lower.includes('refresh token')
  ) {
    return fallback;
  }

  return message;
};

export function HeaderLoginButton() {
  const { address, username, avatarUrl, isAuthenticated, logout, setAuthenticated, syncProfile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [wsStatus, setWsStatus] = useState('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const isLoginFlowInProgress = wsStatus === 'awaiting_card_scan'
    || wsStatus.startsWith('login_device_');

  const avatarLabel = useMemo(() => {
    const trimmedUsername = username?.trim() ?? '';
    if (trimmedUsername) {
      return trimmedUsername.slice(0, 2).toUpperCase();
    }

    const trimmedAddress = address?.trim() ?? '';
    if (!trimmedAddress) {
      return 'AV';
    }

    return trimmedAddress.slice(2, 4).toUpperCase();
  }, [address, username]);

  const resolvedAvatarUrl = useMemo(() => avatarUrl.trim(), [avatarUrl]);

  const qrPayload = useMemo(() => {
    if (!session) {
      return '';
    }
    return buildAuthQrPayload(chainoraApiBase, session);
  }, [session]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(qrPayload, 280), [qrPayload]);

  const statusMessage = useMemo(() => {
    if (wsStatus === 'awaiting_card_scan') {
      return 'QR scanned. Tap your card to continue.';
    }

    if (wsStatus === 'login_device_verify_preparing') {
      return 'Login confirmed. Setting up your card...';
    }
    if (wsStatus === 'login_device_verify_challenge') {
      return 'Checking your card...';
    }
    if (wsStatus === 'login_device_verify_backend') {
      return 'Finalizing sign-in...';
    }
    if (wsStatus === 'login_device_attestation_request') {
      return 'Preparing sign-in...';
    }
    if (wsStatus === 'login_device_verification_submit') {
      return 'Confirming sign-in...';
    }
    if (wsStatus === 'login_device_verification_receipt') {
      return 'Almost done...';
    }
    if (wsStatus === 'login_device_verify_success') {
      return 'Sign-in complete.';
    }
    if (wsStatus === 'login_device_verify_failed') {
      return 'Sign-in complete. Some setup steps can be retried later.';
    }

    if (wsStatus === 'verified') {
      return 'Login successful.';
    }

    if (wsStatus === 'connecting') {
      return 'Connecting...';
    }
    if (wsStatus === 'connected' || wsStatus === 'qr_ready') {
      return 'QR ready. Scan with Chainora app.';
    }
    if (wsStatus === 'message_error') {
      return 'Connection interrupted. Please refresh QR.';
    }
    if (wsStatus === 'error') {
      return 'Connection lost. Please refresh QR.';
    }
    if (wsStatus === 'closed') {
      return 'Window closed.';
    }

    return null;
  }, [wsStatus]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setLoading(false);
    setSession(null);
    setWsStatus('idle');
    setError('');
    wsRef.current?.close();
    wsRef.current = null;
  };

  const startQrLogin = async () => {
    if (isLoginFlowInProgress) {
      return;
    }

    setIsDialogOpen(true);
    setLoading(true);
    setError('');
    setSession(null);
    setWsStatus('idle');

    wsRef.current?.close();
    wsRef.current = null;

    try {
      const createdSession = await createAuthSession(chainoraApiBase);
      setSession(createdSession);

      const ws = openAuthLoginSocket(
        chainoraApiBase,
        createdSession.sessionId,
        payload => {
          if (payload.status) {
            setWsStatus(payload.status);
          }

          if (payload.token && payload.refreshToken) {
            const nextAddress = payload.address ?? '';
            const nextUsername = payload.username ?? '';

            setAuthenticated({
              token: payload.token,
              refreshToken: payload.refreshToken,
              address: nextAddress,
              username: nextUsername,
            });

            void syncProfile(true).catch(() => {
              // Profile sync is best-effort and must not block login.
            });

            setWsStatus('verified');
            closeDialog();
            return;
          }

          if (payload.token && !payload.refreshToken) {
            setError('Could not verify login. Please refresh QR and try again.');
          }
        },
        state => {
          setWsStatus(current => (state === 'closed' && current === 'verified' ? current : state));
        },
      );

      wsRef.current = ws;
    } catch (err) {
      setSession(null);
      setError(normalizeLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && isDialogOpen) {
      closeDialog();
    }
  }, [isAuthenticated, isDialogOpen]);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!avatarMenuRef.current) {
        return;
      }

      if (!avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAvatarMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAvatarMenuOpen]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative" ref={avatarMenuRef}>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:border-sky-300 ${resolvedAvatarUrl ? 'bg-white' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={isAvatarMenuOpen}
            onClick={() => setIsAvatarMenuOpen(prev => !prev)}
          >
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt="User avatar" className="h-full w-full object-cover" />
            ) : (
              avatarLabel
            )}
          </button>

          {isAvatarMenuOpen ? (
            <div className="absolute right-0 top-full z-[150] mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <Link
                to="/profile"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsAvatarMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>

        <Link to="/profile" className="inline-flex">
          <UserDetail username={username} address={address} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          void startQrLogin();
        }}
        className="bg-gradient-to-r from-sky-600 to-cyan-500 text-white hover:from-sky-500 hover:to-cyan-400"
      >
        Login with Chainora Card
      </Button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-500">Chainora Card Login</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Scan and sign with your card</h2>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close login dialog"
                onClick={closeDialog}
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-sky-700">
                {loading ? 'Preparing QR...' : (statusMessage ?? 'Scan QR to continue.')}
              </p>
            </div>

            <div className="mt-5 grid min-h-[280px] place-items-center">
              {isLoginFlowInProgress ? (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-sky-50 p-4 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                  QR already scanned.
                  <br />
                  Continue on your phone and tap your card.
                </div>
              ) : qrImageUrl ? (
                <img src={qrImageUrl} alt="Login QR" className="h-[260px] w-[260px] rounded-xl object-contain ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
                  {loading ? 'Preparing QR...' : 'Could not create QR. Please refresh.'}
                </div>
              )}
            </div>

            {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void startQrLogin();
                }}
                disabled={loading || isLoginFlowInProgress}
              >
                {loading ? 'Refreshing...' : 'Refresh QR'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

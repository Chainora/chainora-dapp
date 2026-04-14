import { useEffect, useMemo, useRef, useState } from 'react';

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

export function HeaderLoginButton() {
  const { address, username, isAuthenticated, logout, setAuthenticated, syncProfile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [wsStatus, setWsStatus] = useState('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const isAwaitingCardScan = wsStatus === 'awaiting_card_scan';

  const qrPayload = useMemo(() => {
    if (!session) {
      return '';
    }
    return buildAuthQrPayload(chainoraApiBase, session);
  }, [session]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(qrPayload, 280), [qrPayload]);

  const statusMessage = useMemo(() => {
    if (wsStatus === 'awaiting_card_scan') {
      return 'pls scan chainora card in your wallet to confirm';
    }

    if (wsStatus === 'verified') {
      return 'Login confirmed';
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
    if (isAwaitingCardScan) {
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
            setError('Invalid login response: missing refresh token');
          }
        },
        state => {
          setWsStatus(current => (state === 'closed' && current === 'verified' ? current : state));
        },
      );

      wsRef.current = ws;
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
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

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <UserDetail username={username} address={address} />
        <Button type="button" variant="ghost" onClick={logout}>
          Logout
        </Button>
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
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Session Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{loading ? 'creating_session' : wsStatus}</p>
              {session ? <p className="mt-1 text-xs text-slate-500">Session: {session.sessionId}</p> : null}
              {statusMessage ? <p className="mt-2 text-sm font-semibold text-sky-700">{statusMessage}</p> : null}
            </div>

            <div className="mt-5 grid min-h-[280px] place-items-center">
              {wsStatus === 'awaiting_card_scan' ? (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-sky-50 p-4 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                  pls scan card to login dapp
                </div>
              ) : qrImageUrl ? (
                <img src={qrImageUrl} alt="Login QR" className="h-[260px] w-[260px] rounded-xl object-contain ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
                  {loading ? 'Preparing QR...' : 'Unable to create QR'}
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
                disabled={loading || isAwaitingCardScan}
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

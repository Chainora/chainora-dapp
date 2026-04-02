import { useEffect, useMemo, useRef, useState } from 'react';

import { chainoraApiBase } from '../../configs/api';
import { useAuth } from '../../context/AuthContext';
import {
  AuthSessionResponse,
  buildAuthQrPayload,
  createAuthSession,
  openAuthLoginSocket,
} from '../../services/authQrFlow';
import { buildQrImageUrl } from '../../services/qrFlow';
import { Button } from '../ui/Button';

const shortenAddress = (address: string) => {
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function HeaderLoginButton() {
  const { address, isAuthenticated, logout, setAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [wsStatus, setWsStatus] = useState('idle');
  const wsRef = useRef<WebSocket | null>(null);

  const qrPayload = useMemo(() => {
    if (!session) {
      return '';
    }
    return buildAuthQrPayload(chainoraApiBase, session);
  }, [session]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(qrPayload, 280), [qrPayload]);

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
          if (payload.token && payload.refreshToken) {
            setAuthenticated({
              token: payload.token,
              refreshToken: payload.refreshToken,
              address: payload.address ?? '',
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
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {address ? shortenAddress(address) : 'Card verified'}
        </span>
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
            </div>

            <div className="mt-5 grid min-h-[280px] place-items-center">
              {qrImageUrl ? (
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
                disabled={loading}
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

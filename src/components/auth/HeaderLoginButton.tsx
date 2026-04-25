import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useDisconnect, useSignMessage } from 'wagmi';

import { chainoraApiBase } from '../../configs/api';
import { UserDetail } from '../UserDetail';
import { useAuth } from '../../context/AuthContext';
import { useConnectRelayWallet } from '../../hooks/useConnectRelayWallet';
import { createAuthSession, verifyAuthSession } from '../../services/authService';
import { Button } from '../ui/Button';

const normalizeLoginError = (raw: unknown): string => {
  const relayCode = typeof raw === 'object' && raw !== null && 'relayCode' in raw
    ? String((raw as { relayCode?: unknown }).relayCode ?? '').trim()
    : '';
  if (relayCode === 'LOGIN_SCAN_REQUIRED') {
    return 'Mobile wallet did not complete one-tap login. Please scan QR and tap card again.';
  }

  const providerCode = typeof raw === 'object' && raw !== null && 'code' in raw
    ? Number((raw as { code?: unknown }).code)
    : NaN;
  if (providerCode === 4001) {
    return 'Login was cancelled on mobile wallet.';
  }

  if (raw instanceof Error) {
    const message = raw.message.trim();
    if (/LOGIN_SCAN_REQUIRED/i.test(message)) {
      return 'Mobile wallet did not complete one-tap login. Please scan QR and tap card again.';
    }
    if (message) {
      return message;
    }
  }

  return 'Could not complete login. Please try again.';
};

export function HeaderLoginButton() {
  const { disconnect: interwovenDisconnect } = useInterwovenKit();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const connectRelayWallet = useConnectRelayWallet();
  const { address, username, avatarUrl, isAuthenticated, logout, setAuthenticated, syncProfile } = useAuth();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

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

  const handleLogout = useCallback(async () => {
    try {
      interwovenDisconnect();
    } catch (disconnectError) {
      console.warn('[auth] interwoven disconnect on logout failed', disconnectError);
    }

    try {
      await disconnectAsync();
    } catch (disconnectError) {
      console.warn('[auth] wallet disconnect on logout failed', disconnectError);
    }

    logout();
  }, [disconnectAsync, interwovenDisconnect, logout]);

  const runLogin = useCallback(async (walletAddress: string) => {
    setLoading(true);
    console.info('[auth][dapp] login.start', { walletAddress });
    try {
      const session = await createAuthSession(chainoraApiBase);
      const message = `Sign this to login to Chainora: ${session.nonce}`;

      const signature = await signMessageAsync({
        account: walletAddress as `0x${string}`,
        message,
      });

      const verified = await verifyAuthSession(chainoraApiBase, {
        sessionId: session.sessionId,
        address: walletAddress,
        signature,
      });

      setAuthenticated({
        token: verified.token,
        refreshToken: verified.refreshToken,
        address: verified.address || walletAddress,
        username: verified.username ?? '',
      });
      console.info('[auth][dapp] login.success', {
        walletAddress,
        verifiedAddress: verified.address || walletAddress,
      });

      void syncProfile(true).catch(() => {
        // Best-effort profile sync after successful login.
      });
    } catch (loginError) {
      console.warn('[auth][dapp] login.failed', {
        walletAddress,
        message: normalizeLoginError(loginError),
      });
      setError(normalizeLoginError(loginError));
    } finally {
      setLoading(false);
    }
  }, [setAuthenticated, signMessageAsync, syncProfile]);

  const handleLogin = useCallback(async () => {
    setError('');

    try {
      const approvedAddress = await connectRelayWallet({
        mode: 'login',
      });
      await runLogin(approvedAddress);
    } catch (connectError) {
      setError(normalizeLoginError(connectError));
    }
  }, [connectRelayWallet, runLogin]);

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
                  void handleLogout();
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
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={() => {
          void handleLogin();
        }}
        disabled={loading}
        className="bg-gradient-to-r from-sky-600 to-cyan-500 text-white hover:from-sky-500 hover:to-cyan-400 disabled:opacity-70"
      >
        {loading ? 'Signing...' : 'Login with Chainora Card'}
      </Button>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
